/**
 * @fileoverview Orquestación de exportación a GitHub Projects.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getGithubIntegration } from '@/lib/github-integration';
import {
  buildEpicIssueBody,
  buildExportableBacklog,
  buildSprintFieldValue,
  buildSprintMilestoneDescription,
  buildSprintMilestoneTitle,
  buildStoryIssueBody,
} from '@/lib/github/export-mapper';
import {
  addIssueToProject,
  createProjectV2,
  getProjectFields,
  getProjectUrl,
  getRepositoryInfo,
  resolveProjectFieldIds,
  setupProjectCustomFields,
  updateProjectItemNumberField,
  updateProjectItemSelectField,
  updateProjectItemTextField,
  type ProjectFieldIds,
} from '@/lib/github/projects-service';
import {
  addSubIssue,
  createIssue,
  createMilestone,
  createRepository,
  delay,
  ensureLabel,
  GithubRestError,
  listMilestones,
  parseRepoFullName,
  updateIssue,
  verifyRepoWriteAccess,
  type GithubRestIssue,
} from '@/lib/github/rest-client';
import { isValidRepoName, normalizeRepoName } from '@/lib/github/repo-utils';
import { isGithubScopeError } from '@/lib/github/graphql-client';
import { assertGithubExportAllowed } from '@/lib/plans/github-guard';
import { getProjectWorkspace, saveProjectGithubExport } from '@/lib/project-service';
import type {
  GithubExportDestination,
  GithubExportOptions,
  GithubExportPhase,
  GithubExportProgressEvent,
  GithubExportRecord,
  GithubExportRepoTarget,
  GithubExportResponse,
  GithubIssueMapping,
} from '@/lib/types/github-export';
import type { Agent6Input } from '@/lib/types/workspace';

export type GithubExportProgressCallback = (
  event: Omit<GithubExportProgressEvent, 'type'>
) => void;

const EXPORT_LABEL = 'klarify-export';
const STORY_LABEL = 'klarify:story';
const EPIC_LABEL_PREFIX = 'klarify:epic:';

export class GithubExportError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'GithubExportError';
    this.code = code;
  }
}

function reportProgress(
  onProgress: GithubExportProgressCallback | undefined,
  phase: GithubExportPhase,
  label: string,
  extras?: { current?: number; total?: number; detail?: string }
): void {
  onProgress?.({ phase, label, ...extras });
}

export async function exportProjectToGithub(params: {
  uid: string;
  projectId: string;
  repo: GithubExportRepoTarget;
  destination: GithubExportDestination;
  options?: GithubExportOptions;
  existingExport?: GithubExportRecord | null;
  onProgress?: GithubExportProgressCallback;
}): Promise<GithubExportResponse> {
  const { uid, projectId, repo: repoTarget, destination, options, existingExport, onProgress } =
    params;

  reportProgress(onProgress, 'preparing', 'Preparando exportación…');

  await assertGithubExportAllowed(uid);

  const integration = await getGithubIntegration(uid);
  if (!integration?.accessToken) {
    throw new GithubExportError('Conecta tu cuenta de GitHub antes de exportar.', 'GITHUB_NOT_CONNECTED');
  }

  const workspace = await getProjectWorkspace(uid, projectId);
  const agent6Input = workspace.pipeline.agent6Input;
  if (!agent6Input) {
    throw new GithubExportError(
      'Completa la planificación de sprints (Agente 5) antes de exportar.',
      'PIPELINE_INCOMPLETE'
    );
  }

  const accessToken = integration.accessToken;
  const warnings: string[] = [];

  reportProgress(
    onProgress,
    'repository',
    repoTarget.mode === 'create' ? 'Creando repositorio…' : 'Verificando repositorio…'
  );

  const { fullName: repoFullName, created: repoCreated, htmlUrl: repoUrl } =
    await resolveExportRepository(accessToken, integration.username, repoTarget);

  const { owner, repo } = parseRepoFullName(repoFullName);

  try {
    await verifyRepoWriteAccess(accessToken, owner, repo);
  } catch {
    throw new GithubExportError(
      `No tienes permisos de escritura en ${repoFullName}.`,
      'GITHUB_REPO_FORBIDDEN'
    );
  }

  const backlog = buildExportableBacklog(agent6Input);
  const createEpicIssues = options?.createEpicIssues ?? true;
  const createMilestones = options?.createMilestones ?? true;
  const epicTotal = createEpicIssues ? backlog.epics.length : 0;
  const storyTotal = backlog.stories.length;
  const sprintTotal = createMilestones ? backlog.sprints.length : 0;

  if (repoCreated) {
    warnings.push(`Se creó el repositorio ${repoFullName}.`);
  }

  const repoInfo = await getRepositoryInfo(accessToken, owner, repo);

  let githubProjectId: string;
  let githubProjectUrl: string;

  reportProgress(
    onProgress,
    'project',
    destination.mode === 'create' ? 'Creando GitHub Project…' : 'Vinculando GitHub Project…'
  );

  if (destination.mode === 'create') {
    if (!destination.projectTitle?.trim()) {
      throw new GithubExportError('El título del project es obligatorio.', 'INVALID_DESTINATION');
    }
    const created = await createProjectV2(
      accessToken,
      repoInfo.ownerId,
      destination.projectTitle.trim(),
      repoInfo.id
    );
    githubProjectId = created.id;
    githubProjectUrl = created.url;
  } else {
    if (!destination.githubProjectId) {
      throw new GithubExportError('Selecciona un GitHub Project existente.', 'INVALID_DESTINATION');
    }
    githubProjectId = destination.githubProjectId;
    githubProjectUrl = await getProjectUrl(accessToken, githubProjectId);
  }

  reportProgress(onProgress, 'fields', 'Configurando campos del project…');

  let fieldIds: ProjectFieldIds;
  if (destination.mode === 'create') {
    fieldIds = await setupProjectCustomFields(
      accessToken,
      githubProjectId,
      backlog.priorityOptionNames
    );
  } else {
    const fields = await getProjectFields(accessToken, githubProjectId);
    fieldIds = resolveProjectFieldIds(fields);
  }

  reportProgress(onProgress, 'labels', 'Preparando etiquetas…');
  await ensureLabel(accessToken, owner, repo, EXPORT_LABEL, '0e8a16');
  await ensureLabel(accessToken, owner, repo, STORY_LABEL, '1d76db');

  const repoChanged = existingExport != null && existingExport.repoFullName !== repoFullName;
  if (repoChanged) {
    warnings.push(
      `El repositorio cambió (${existingExport.repoFullName} → ${repoFullName}). Se crearán issues nuevos.`
    );
  }

  const priorMappings =
    existingExport && !repoChanged
      ? existingExport.mappings
      : { epics: {}, stories: {}, milestones: {} };

  const epicMappings: Record<string, GithubIssueMapping> = { ...priorMappings.epics };
  const storyMappings: Record<string, GithubIssueMapping> = { ...priorMappings.stories };
  const milestoneMappings: Record<string, { number: number }> = { ...priorMappings.milestones };

  let epicsCreated = 0;
  let epicsUpdated = 0;
  let storiesCreated = 0;
  let storiesUpdated = 0;
  let milestonesCreated = 0;
  let itemsAddedToProject = 0;

  if (createMilestones) {
    const existingMilestones = await listMilestones(accessToken, owner, repo);
    let sprintIndex = 0;
    for (const sprint of backlog.sprints) {
      sprintIndex += 1;
      const title = buildSprintMilestoneTitle(sprint);
      reportProgress(onProgress, 'milestones', 'Creando milestones de sprint…', {
        current: sprintIndex,
        total: sprintTotal,
        detail: title,
      });

      const prior = milestoneMappings[sprint.id];
      const found = existingMilestones.find((m) => m.number === prior?.number || m.title === title);

      if (found) {
        milestoneMappings[sprint.id] = { number: found.number };
        continue;
      }

      const milestone = await createMilestone(accessToken, owner, repo, {
        title,
        description: buildSprintMilestoneDescription(sprint),
        due_on: sprint.endDate ? `${sprint.endDate}T23:59:59Z` : undefined,
      });
      milestoneMappings[sprint.id] = { number: milestone.number };
      milestonesCreated += 1;
      await delay(75);
    }
  }

  if (createEpicIssues) {
    let epicIndex = 0;
    for (const epic of backlog.epics) {
      epicIndex += 1;
      reportProgress(onProgress, 'epics', 'Exportando épicas…', {
        current: epicIndex,
        total: epicTotal,
        detail: epic.title,
      });

      const epicLabel = `${EPIC_LABEL_PREFIX}${epic.id}`;
      await ensureLabel(accessToken, owner, repo, epicLabel, '5319e7');

      const existing = epicMappings[epic.id];
      const body = buildEpicIssueBody(epic);
      const title = `[Epic] ${epic.title}`;

      const upserted = await upsertIssue(accessToken, owner, repo, existing, {
        title,
        body,
        labels: [EXPORT_LABEL, epicLabel],
      });
      const issue = upserted.issue;
      if (upserted.created) {
        epicsCreated += 1;
        if (upserted.recreated) {
          warnings.push(
            `La épica ${epic.id} no existía en GitHub; se creó un issue nuevo (#${issue.number}).`
          );
        }
      } else {
        epicsUpdated += 1;
      }

      epicMappings[epic.id] = { issueNumber: issue.number, nodeId: issue.node_id };

      try {
        const itemId = await addIssueToProject(accessToken, githubProjectId, issue.node_id);
        await applyEpicProjectFields(accessToken, githubProjectId, itemId, fieldIds, epic);
        itemsAddedToProject += 1;
      } catch {
        warnings.push(`No se pudo agregar la épica ${epic.id} al GitHub Project.`);
      }

      await delay(75);
    }
  }

  let storyIndex = 0;
  for (const exportable of backlog.stories) {
    const { story, epic, sprint } = exportable;
    storyIndex += 1;
    reportProgress(onProgress, 'stories', 'Exportando historias…', {
      current: storyIndex,
      total: storyTotal,
      detail: `${story.id}: ${story.title}`,
    });

    const storyLabel = `klarify:${story.id}`;
    await ensureLabel(accessToken, owner, repo, storyLabel, 'fbca04');

    const body = buildStoryIssueBody(exportable, backlog.stories);
    const title = `${story.id}: ${story.title}`;
    const labels = [EXPORT_LABEL, STORY_LABEL, storyLabel, `${EPIC_LABEL_PREFIX}${epic.id}`];
    const milestoneNumber = sprint ? milestoneMappings[sprint.id]?.number : undefined;

    const existing = storyMappings[story.id];
    const upserted = await upsertIssue(accessToken, owner, repo, existing, {
      title,
      body,
      labels,
      milestone: milestoneNumber ?? null,
    });
    const issue = upserted.issue;
    if (upserted.created) {
      storiesCreated += 1;
      if (upserted.recreated) {
        warnings.push(
          `${story.id} no existía en GitHub; se creó un issue nuevo (#${issue.number}).`
        );
      }
    } else {
      storiesUpdated += 1;
    }

    storyMappings[story.id] = { issueNumber: issue.number, nodeId: issue.node_id };

    const epicMapping = epicMappings[epic.id];
    if (epicMapping) {
      await addSubIssue(accessToken, owner, repo, epicMapping.issueNumber, issue.number);
    }

    try {
      const itemId = await addIssueToProject(accessToken, githubProjectId, issue.node_id);
      await applyStoryProjectFields(
        accessToken,
        githubProjectId,
        itemId,
        fieldIds,
        exportable,
        sprint ? buildSprintFieldValue(sprint) : null
      );
      itemsAddedToProject += 1;
    } catch {
      warnings.push(`No se pudo agregar ${story.id} al GitHub Project.`);
    }

    if (!sprint) {
      warnings.push(`${story.id} no tiene sprint asignado.`);
    }

    await delay(75);
  }

  reportProgress(onProgress, 'saving', 'Guardando registro de exportación…');

  const exportRecord: GithubExportRecord = {
    repoFullName,
    githubProjectId,
    githubProjectUrl,
    lastExportAt: FieldValue.serverTimestamp(),
    mappings: {
      epics: epicMappings,
      stories: storyMappings,
      milestones: milestoneMappings,
    },
  };

  await saveProjectGithubExport(uid, projectId, exportRecord);

  return {
    success: true,
    githubProjectUrl,
    githubProjectId,
    repoFullName,
    repoUrl,
    repoCreated,
    summary: {
      epicsCreated,
      epicsUpdated,
      storiesCreated,
      storiesUpdated,
      milestonesCreated,
      itemsAddedToProject,
    },
    ...(warnings.length > 0 ? { warnings: [...new Set(warnings)] } : {}),
  };
}

async function resolveExportRepository(
  accessToken: string,
  username: string,
  repoTarget: GithubExportRepoTarget
): Promise<{ fullName: string; created: boolean; htmlUrl: string }> {
  if (repoTarget.mode === 'existing') {
    const fullName = repoTarget.fullName?.trim();
    if (!fullName) {
      throw new GithubExportError('Selecciona un repositorio destino.', 'INVALID_REPO');
    }

    try {
      const { owner, repo } = parseRepoFullName(fullName);
      await verifyRepoWriteAccess(accessToken, owner, repo);
    } catch (error) {
      if (error instanceof GithubExportError) {
        throw error;
      }
      throw new GithubExportError(
        `No tienes permisos de escritura en ${fullName}.`,
        'GITHUB_REPO_FORBIDDEN'
      );
    }

    const { owner, repo } = parseRepoFullName(fullName);
    return {
      fullName,
      created: false,
      htmlUrl: `https://github.com/${owner}/${repo}`,
    };
  }

  const name = normalizeRepoName(repoTarget.name ?? '');
  if (!isValidRepoName(name)) {
    throw new GithubExportError(
      'El nombre del repositorio solo puede contener letras minúsculas, números, puntos, guiones y guiones bajos.',
      'INVALID_REPO_NAME'
    );
  }

  try {
    const created = await createRepository(accessToken, {
      name,
      description: repoTarget.description?.trim() || 'Backlog exportado desde Klarify',
      private: repoTarget.private ?? false,
      auto_init: true,
    });

    return {
      fullName: created.full_name,
      created: true,
      htmlUrl: created.html_url,
    };
  } catch (error) {
    if (error instanceof GithubRestError && error.status === 422) {
      throw new GithubExportError(
        `Ya existe un repositorio llamado "${name}" en @${username}. Elige otro nombre.`,
        'GITHUB_REPO_EXISTS'
      );
    }
    throw error;
  }
}

async function upsertIssue(
  accessToken: string,
  owner: string,
  repo: string,
  existing: GithubIssueMapping | undefined,
  payload: {
    title: string;
    body: string;
    labels: string[];
    milestone?: number | null;
  }
): Promise<{ issue: GithubRestIssue; created: boolean; recreated: boolean }> {
  if (!existing) {
    const issue = await createIssue(accessToken, owner, repo, {
      title: payload.title,
      body: payload.body,
      labels: payload.labels,
      ...(payload.milestone != null ? { milestone: payload.milestone } : {}),
    });
    return { issue, created: true, recreated: false };
  }

  try {
    const issue = await updateIssue(accessToken, owner, repo, existing.issueNumber, {
      title: payload.title,
      body: payload.body,
      labels: payload.labels,
      milestone: payload.milestone ?? null,
    });
    return { issue, created: false, recreated: false };
  } catch (error) {
    if (!(error instanceof GithubRestError) || error.status !== 404) {
      throw error;
    }

    const issue = await createIssue(accessToken, owner, repo, {
      title: payload.title,
      body: payload.body,
      labels: payload.labels,
      ...(payload.milestone != null ? { milestone: payload.milestone } : {}),
    });
    return { issue, created: true, recreated: true };
  }
}

async function applyEpicProjectFields(
  accessToken: string,
  projectId: string,
  itemId: string,
  fieldIds: ProjectFieldIds,
  epic: { id: string; title: string }
): Promise<void> {
  if (fieldIds.epic) {
    await updateProjectItemTextField(
      accessToken,
      projectId,
      itemId,
      fieldIds.epic,
      `${epic.id}: ${epic.title}`
    );
  }
}

async function applyStoryProjectFields(
  accessToken: string,
  projectId: string,
  itemId: string,
  fieldIds: ProjectFieldIds,
  exportable: ReturnType<typeof buildExportableBacklog>['stories'][number],
  sprintValue: string | null
): Promise<void> {
  const { epic, points, priorityLabel } = exportable;

  if (fieldIds.storyPoints && points > 0) {
    await updateProjectItemNumberField(accessToken, projectId, itemId, fieldIds.storyPoints, points);
  }

  if (fieldIds.epic) {
    await updateProjectItemTextField(
      accessToken,
      projectId,
      itemId,
      fieldIds.epic,
      `${epic.id}: ${epic.title}`
    );
  }

  if (fieldIds.sprint && sprintValue) {
    await updateProjectItemTextField(accessToken, projectId, itemId, fieldIds.sprint, sprintValue);
  }

  if (fieldIds.priority && fieldIds.priorityOptions) {
    const optionId =
      fieldIds.priorityOptions[priorityLabel.toLowerCase()] ??
      fieldIds.priorityOptions[exportable.priorityCategory.toLowerCase()];
    if (optionId) {
      await updateProjectItemSelectField(
        accessToken,
        projectId,
        itemId,
        fieldIds.priority,
        optionId
      );
    }
  }
}

export function mapGithubExportError(error: unknown): { message: string; code: string; status: number } {
  if (error instanceof GithubExportError) {
    return { message: error.message, code: error.code, status: 400 };
  }
  if (isGithubScopeError(error)) {
    return {
      message: 'Reconecta tu cuenta de GitHub para autorizar acceso a Projects.',
      code: 'GITHUB_SCOPE_REQUIRED',
      status: 403,
    };
  }
  if (error instanceof Error && error.message === 'INVALID_REPO_FULL_NAME') {
    return { message: 'Repositorio inválido.', code: 'INVALID_REPO', status: 400 };
  }
  if (error instanceof GithubExportError && error.code === 'GITHUB_REPO_EXISTS') {
    return { message: error.message, code: error.code, status: 409 };
  }
  if (error instanceof GithubExportError && error.code === 'INVALID_REPO_NAME') {
    return { message: error.message, code: error.code, status: 400 };
  }
  if (error instanceof Error && error.message === 'PROJECT_NOT_FOUND') {
    return { message: 'Proyecto no encontrado.', code: 'PROJECT_NOT_FOUND', status: 404 };
  }
  return { message: 'Error al exportar a GitHub.', code: 'GITHUB_EXPORT_FAILED', status: 500 };
}

export function validateAgent6Input(input: Agent6Input | null): input is Agent6Input {
  return input !== null;
}
