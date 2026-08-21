/**
 * @fileoverview Servicio de proyectos multiproyecto en Firestore.
 */

import { FieldValue } from 'firebase-admin/firestore';
import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { canChangeProjectSlotSelection } from '@/lib/plans/project-slot-selection';
import { assertCanCreateProject, assertProjectSlotAccessible, ensureUserAccount, resolveUserPlan } from '@/lib/plans/plan-service';
import type { PlanId } from '@/lib/plans/types';
import { PlanLimitError } from '@/lib/plans/plan-errors';
import type { ProjectDocument, ProjectSlotsInfo, ProjectSummary, ProjectsListResponse } from '@/lib/types/project';
import type { GithubExportRecord } from '@/lib/types/github-export';
import { createEmptyWorkspace, type UserWorkspace } from '@/lib/types/workspace';
import { computePipelineProgress } from '@/lib/utils/project-progress';
import { normalizeSprintPlan } from '@/lib/utils/sprint-plan-mutations';
import { normalizeEpics } from '@/lib/utils/work-item-validation';

const EMPTY_AGENT3 = {
  input: null,
  estimations: {},
  status: 'idle' as const,
  error: null,
};

const EMPTY_AGENT4 = {
  input: null,
  priorities: {},
  framework: 'moscow' as const,
  status: 'idle' as const,
  error: null,
};

const EMPTY_AGENT5 = {
  input: null,
  plan: null,
  status: 'idle' as const,
  error: null,
};

function userDoc(uid: string) {
  return adminDb.collection('users').doc(uid);
}

function projectsCol(uid: string) {
  return userDoc(uid).collection('projects');
}

function projectDoc(uid: string, projectId: string) {
  return projectsCol(uid).doc(projectId);
}

function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeAgentEpics<T extends { epics?: import('@/lib/types/agent-2').Epic[] } | null>(
  value: T
): T {
  if (!value || !Array.isArray(value.epics)) return value;
  return { ...value, epics: normalizeEpics(value.epics) };
}

function normalizeWorkspace(ws: Partial<UserWorkspace> | undefined): UserWorkspace {
  const empty = createEmptyWorkspace();
  if (!ws) return empty;

  const agent2 = {
    ...empty.agent2,
    ...(ws.agent2 ?? {}),
    epics: normalizeEpics(ws.agent2?.epics ?? empty.agent2.epics),
  };

  return {
    agent1: { ...empty.agent1, ...(ws.agent1 ?? {}) },
    agent2,
    agent3: {
      ...EMPTY_AGENT3,
      ...(ws.agent3 ?? {}),
      input: normalizeAgentEpics(ws.agent3?.input ?? null),
      estimations: { ...EMPTY_AGENT3.estimations, ...(ws.agent3?.estimations ?? {}) },
    },
    agent4: {
      ...EMPTY_AGENT4,
      ...(ws.agent4 ?? {}),
      input: normalizeAgentEpics(ws.agent4?.input ?? null),
      priorities: { ...EMPTY_AGENT4.priorities, ...(ws.agent4?.priorities ?? {}) },
    },
    agent5: {
      ...EMPTY_AGENT5,
      ...(ws.agent5 ?? {}),
      input: normalizeAgentEpics(ws.agent5?.input ?? null),
      plan: ws.agent5?.plan ? normalizeSprintPlan(ws.agent5.plan) : null,
    },
    pipeline: {
      agent2Input: ws.pipeline?.agent2Input ?? null,
      agent3Input: normalizeAgentEpics(ws.pipeline?.agent3Input ?? null),
      agent4Input: normalizeAgentEpics(ws.pipeline?.agent4Input ?? null),
      agent5Input: normalizeAgentEpics(ws.pipeline?.agent5Input ?? null),
      agent6Input: ws.pipeline?.agent6Input
        ? {
            ...ws.pipeline.agent6Input,
            epics: normalizeEpics(ws.pipeline.agent6Input.epics ?? []),
            plan: ws.pipeline.agent6Input.plan
              ? normalizeSprintPlan(ws.pipeline.agent6Input.plan)
              : ws.pipeline.agent6Input.plan,
          }
        : null,
    },
    execution: ws.execution ?? null,
    stack:
      ws.stack != null
        ? {
            ...ws.stack,
            status: ws.stack.status === 'proposed' ? 'saved' : ws.stack.status,
          }
        : null,
  };
}

function normalizeProjectStatus(raw: string | undefined): ProjectDocument['status'] {
  return raw === 'locked' ? 'locked' : 'active';
}

function toSummary(
  id: string,
  data: FirebaseFirestore.DocumentData
): ProjectSummary {
  const doc = data as ProjectDocument;
  const updatedAt =
    doc.updatedAt && typeof (doc.updatedAt as FirebaseFirestore.Timestamp).toMillis === 'function'
      ? (doc.updatedAt as FirebaseFirestore.Timestamp).toMillis()
      : Date.now();

  const hasDenorm =
    typeof doc.pipelineStep === 'number' &&
    typeof doc.completionPercentage === 'number' &&
    typeof doc.pipelineLabel === 'string';

  const progress = hasDenorm
    ? {
        pipelineStep: doc.pipelineStep as number,
        pipelineLabel: doc.pipelineLabel as string,
        completionPercentage: doc.completionPercentage as number,
      }
    : computePipelineProgress(normalizeWorkspace(doc.workspace));

  return {
    id,
    name: doc.name ?? 'Proyecto sin nombre',
    status: normalizeProjectStatus(doc.status),
    updatedAt,
    lastAgent: doc.lastAgent ?? '1',
    ...progress,
  };
}

async function fetchAllProjects(uid: string): Promise<ProjectSummary[]> {
  const snapshot = await projectsCol(uid).where('status', 'in', ['active', 'locked']).get();
  return snapshot.docs
    .map((doc) => toSummary(doc.id, doc.data()))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function getSlotSelectionConfirmedForPlan(
  prefs: { slotSelectionConfirmedForPlan?: string } | undefined
): PlanId | undefined {
  const raw = prefs?.slotSelectionConfirmedForPlan;
  if (raw === 'free' || raw === 'starter' || raw === 'pro') {
    return raw;
  }
  return undefined;
}

async function clearSlotSelectionConfirmation(uid: string): Promise<void> {
  await userDoc(uid).set(
    {
      preferences: {
        slotSelectionConfirmedForPlan: FieldValue.delete(),
      },
    },
    { merge: true }
  );
}

function buildSlotsInfo(
  projects: ProjectSummary[],
  maxActive: number,
  effectivePlanId: PlanId,
  confirmedForPlan: PlanId | undefined
): ProjectSlotsInfo {
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const lockedCount = projects.filter((p) => p.status === 'locked').length;
  return {
    maxActive,
    activeCount,
    lockedCount,
    canChangeSelection: canChangeProjectSlotSelection(
      effectivePlanId,
      confirmedForPlan,
      lockedCount,
      projects.length
    ),
  };
}

/**
 * Ajusta proyectos activos/bloqueados al límite del plan efectivo.
 * - Si caben todos → desbloquea automáticamente (upgrade).
 * - Si hay demasiados activos → bloquea excedentes (downgrade).
 * Devuelve la lista final de proyectos (evita un segundo fetchAllProjects en listProjects).
 */
export async function syncProjectSlots(
  uid: string,
  options?: {
    plan?: Awaited<ReturnType<typeof resolveUserPlan>>;
    projects?: ProjectSummary[];
    preferredActiveId?: string | null;
  }
): Promise<ProjectSummary[]> {
  const plan = options?.plan ?? (await resolveUserPlan(uid));
  const maxActive = plan.limits.maxProjects;
  let projects = options?.projects ?? (await fetchAllProjects(uid));
  const total = projects.length;
  const lockedProjects = projects.filter((p) => p.status === 'locked');
  const activeProjects = projects.filter((p) => p.status === 'active');

  if (total <= maxActive && lockedProjects.length > 0) {
    const batch = adminDb.batch();
    for (const project of lockedProjects) {
      batch.update(projectDoc(uid, project.id), { status: 'active' });
    }
    await batch.commit();
    await clearSlotSelectionConfirmation(uid);
    return fetchAllProjects(uid);
  }

  if (activeProjects.length <= maxActive) {
    return projects;
  }

  let preferredId = options?.preferredActiveId ?? null;
  if (preferredId === null && options?.preferredActiveId === undefined) {
    const userSnapshot = await userDoc(uid).get();
    preferredId =
      (userSnapshot.data()?.preferences as { activeProjectId?: string } | undefined)
        ?.activeProjectId ?? null;
  }

  const ranked = [...activeProjects].sort((a, b) => {
    if (a.id === preferredId) return -1;
    if (b.id === preferredId) return 1;
    return b.updatedAt - a.updatedAt;
  });

  const keepActiveIds = new Set(ranked.slice(0, maxActive).map((p) => p.id));
  const batch = adminDb.batch();

  for (const project of activeProjects) {
    if (!keepActiveIds.has(project.id)) {
      batch.update(projectDoc(uid, project.id), { status: 'locked' });
    }
  }

  await batch.commit();

  await clearSlotSelectionConfirmation(uid);

  if (preferredId && !keepActiveIds.has(preferredId)) {
    const fallbackId = ranked.find((p) => keepActiveIds.has(p.id))?.id;
    if (fallbackId) {
      await userDoc(uid).set(
        { preferences: { activeProjectId: fallbackId } },
        { merge: true }
      );
    }
  }

  return fetchAllProjects(uid);
}

export async function requireUnlockedProject(uid: string, projectId: string): Promise<void> {
  const doc = await projectDoc(uid, projectId).get();
  if (!doc.exists) {
    throw new Error('PROJECT_NOT_FOUND');
  }
  const status = normalizeProjectStatus((doc.data() as ProjectDocument).status);
  assertProjectSlotAccessible(status);
}

/**
 * Carga el proyecto activo y su workspace en una sola lectura del documento.
 * Evita el doble get (resolver ID y luego volver a pedir el workspace).
 */
export async function loadActiveProjectWorkspace(
  uid: string,
  preloadedUserSnapshot?: DocumentSnapshot
): Promise<{ projectId: string; workspace: UserWorkspace } | null> {
  const userSnapshot = preloadedUserSnapshot ?? (await ensureUserAccount(uid));
  const preferredId =
    (userSnapshot.data()?.preferences as { activeProjectId?: string } | undefined)
      ?.activeProjectId ?? null;

  if (preferredId) {
    const doc = await projectDoc(uid, preferredId).get();
    if (doc.exists) {
      const data = doc.data() as ProjectDocument;
      const status = normalizeProjectStatus(data.status);
      if (status === 'active') {
        assertProjectSlotAccessible(status);
        return { projectId: preferredId, workspace: normalizeWorkspace(data.workspace) };
      }
    }
  }

  const activeSnap = await projectsCol(uid).where('status', '==', 'active').limit(1).get();
  if (!activeSnap.empty) {
    const doc = activeSnap.docs[0];
    const projectId = doc.id;
    if (projectId !== preferredId) {
      await userDoc(uid).set(
        { preferences: { activeProjectId: projectId } },
        { merge: true }
      );
    }
    const data = doc.data() as ProjectDocument;
    assertProjectSlotAccessible(normalizeProjectStatus(data.status));
    return { projectId, workspace: normalizeWorkspace(data.workspace) };
  }

  const anyProject = await projectsCol(uid).limit(1).get();
  if (anyProject.empty) {
    const migratedId = await migrateLegacyWorkspace(uid);
    if (!migratedId) return null;
    const migratedDoc = await projectDoc(uid, migratedId).get();
    if (!migratedDoc.exists) return null;
    const migratedData = migratedDoc.data() as ProjectDocument;
    return {
      projectId: migratedId,
      workspace: normalizeWorkspace(migratedData.workspace),
    };
  }

  return null;
}

/**
 * Resuelve el proyecto activo con lecturas mínimas (sin sincronizar slots).
 * Usar en rutas calientes: GET/PATCH workspace, movimientos del tablero, etc.
 * Acepta snapshot de usuario precargado para evitar ensureUserAccount duplicado.
 */
export async function readActiveProjectId(
  uid: string,
  preloadedUserSnapshot?: DocumentSnapshot
): Promise<string | null> {
  const loaded = await loadActiveProjectWorkspace(uid, preloadedUserSnapshot);
  return loaded?.projectId ?? null;
}

async function migrateLegacyWorkspace(uid: string): Promise<string | null> {
  const snapshot = await userDoc(uid).get();
  const data = snapshot.data();
  const legacyWorkspace = data?.workspace as Partial<UserWorkspace> | undefined;

  if (!legacyWorkspace) {
    return null;
  }

  const projectId = 'default';
  const prefs = data?.preferences as { lastAgent?: string } | undefined;
  const workspace = normalizeWorkspace(legacyWorkspace);
  const progress = computePipelineProgress(workspace);

  await projectDoc(uid, projectId).set({
    name: 'Mi proyecto',
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastAgent: prefs?.lastAgent ?? '1',
    workspace,
    ...progress,
  });

  await userDoc(uid).set(
    {
      preferences: {
        activeProjectId: projectId,
        lastAgent: prefs?.lastAgent ?? '1',
      },
      workspace: FieldValue.delete(),
    },
    { merge: true }
  );

  return projectId;
}

export async function tryResolveActiveProjectId(uid: string): Promise<string | null> {
  await syncProjectSlots(uid);
  return readActiveProjectId(uid);
}

export async function resolveActiveProjectId(uid: string): Promise<string> {
  const projectId = await tryResolveActiveProjectId(uid);
  if (!projectId) {
    throw new Error('NO_PROJECTS');
  }
  return projectId;
}

export async function getProjectWorkspace(
  uid: string,
  projectId: string
): Promise<UserWorkspace> {
  const doc = await projectDoc(uid, projectId).get();
  if (!doc.exists) {
    throw new Error('PROJECT_NOT_FOUND');
  }
  const data = doc.data() as ProjectDocument;
  assertProjectSlotAccessible(normalizeProjectStatus(data.status));
  return normalizeWorkspace(data.workspace);
}

export async function listProjects(uid: string): Promise<
  ProjectsListResponse & { plan: Awaited<ReturnType<typeof resolveUserPlan>> }
> {
  const [userSnapshot, projects] = await Promise.all([
    ensureUserAccount(uid),
    fetchAllProjects(uid),
  ]);
  const plan = await resolveUserPlan(uid, userSnapshot);

  const prefs = userSnapshot.data()?.preferences as
    | { activeProjectId?: string; slotSelectionConfirmedForPlan?: string }
    | undefined;
  const preferredActiveId = prefs?.activeProjectId ?? null;

  const syncedProjects = await syncProjectSlots(uid, {
    plan,
    projects,
    preferredActiveId,
  });

  const confirmedForPlan = getSlotSelectionConfirmedForPlan(prefs);

  return {
    projects: syncedProjects,
    activeProjectId: preferredActiveId,
    slots: buildSlotsInfo(syncedProjects, plan.limits.maxProjects, plan.id, confirmedForPlan),
    plan,
  };
}

export async function createProject(uid: string, name: string): Promise<ProjectSummary> {
  const projectName = name.trim();
  if (!projectName) {
    throw new Error('PROJECT_NAME_REQUIRED');
  }

  const { projects } = await listProjects(uid);
  await assertCanCreateProject(uid, projects.length);

  const projectId = generateProjectId();
  const emptyWorkspace = createEmptyWorkspace();
  const progress = computePipelineProgress(emptyWorkspace);

  await projectDoc(uid, projectId).set({
    name: projectName,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastAgent: '1',
    workspace: emptyWorkspace,
    ...progress,
  });

  await syncProjectSlots(uid);

  await userDoc(uid).set(
    {
      preferences: { activeProjectId: projectId, lastAgent: '1' },
    },
    { merge: true }
  );

  const doc = await projectDoc(uid, projectId).get();
  return toSummary(projectId, doc.data()!);
}

export async function switchProject(
  uid: string,
  projectId: string
): Promise<{
  project: ProjectSummary;
  workspace: UserWorkspace;
  preferences: { lastAgent: string };
  plan: Awaited<ReturnType<typeof resolveUserPlan>>;
}> {
  const doc = await projectDoc(uid, projectId).get();
  if (!doc.exists) {
    throw new Error('PROJECT_NOT_FOUND');
  }

  const data = doc.data() as ProjectDocument;
  assertProjectSlotAccessible(normalizeProjectStatus(data.status));

  const lastAgent = data.lastAgent ?? '1';
  await userDoc(uid).set(
    {
      preferences: {
        activeProjectId: projectId,
        lastAgent,
      },
    },
    { merge: true }
  );

  const plan = await resolveUserPlan(uid);

  return {
    project: toSummary(projectId, data),
    workspace: normalizeWorkspace(data.workspace),
    preferences: { lastAgent },
    plan,
  };
}

/** Activa los proyectos indicados y bloquea el resto (máx. según plan). Elección única por plan. */
export async function activateProjectSlots(
  uid: string,
  projectIds: string[]
): Promise<ProjectsListResponse> {
  const plan = await resolveUserPlan(uid);
  const maxActive = plan.limits.maxProjects;

  if (projectIds.length === 0) {
    throw new Error('INVALID_ACTIVATION');
  }

  const userSnapshot = await userDoc(uid).get();
  const prefs = userSnapshot.data()?.preferences as
    | { activeProjectId?: string; slotSelectionConfirmedForPlan?: string }
    | undefined;
  const confirmedForPlan = getSlotSelectionConfirmedForPlan(prefs);
  const allProjectsBefore = await fetchAllProjects(uid);
  const lockedBefore = allProjectsBefore.filter((p) => p.status === 'locked').length;

  if (
    !canChangeProjectSlotSelection(
      plan.id,
      confirmedForPlan,
      lockedBefore,
      allProjectsBefore.length
    ) &&
    lockedBefore > 0
  ) {
    throw new PlanLimitError(
      'Ya confirmaste qué proyectos conservar con tu plan actual. Mejora tu plan para acceder a más proyectos.',
      'PLAN_PROJECT_SELECTION_LOCKED',
      { upgradeTo: plan.id === 'free' ? 'starter' : plan.id === 'starter' ? 'pro' : undefined }
    );
  }

  if (projectIds.length > maxActive) {
    throw new PlanLimitError(
      `Tu plan ${plan.id} permite hasta ${maxActive} proyecto(s) activo(s).`,
      'PLAN_PROJECT_LIMIT',
      { upgradeTo: plan.id === 'free' ? 'starter' : plan.id === 'starter' ? 'pro' : undefined }
    );
  }

  const uniqueIds = [...new Set(projectIds)];
  const allProjects = await fetchAllProjects(uid);
  const knownIds = new Set(allProjects.map((p) => p.id));

  for (const id of uniqueIds) {
    if (!knownIds.has(id)) {
      throw new Error('PROJECT_NOT_FOUND');
    }
  }

  const batch = adminDb.batch();
  for (const project of allProjects) {
    const nextStatus = uniqueIds.includes(project.id) ? 'active' : 'locked';
    if (project.status !== nextStatus) {
      batch.update(projectDoc(uid, project.id), { status: nextStatus });
    }
  }
  await batch.commit();

  const currentActiveId = prefs?.activeProjectId ?? null;

  if (!currentActiveId || !uniqueIds.includes(currentActiveId)) {
    await userDoc(uid).set(
      { preferences: { activeProjectId: uniqueIds[0] } },
      { merge: true }
    );
  }

  const lockedAfter = allProjectsBefore.length - uniqueIds.length;
  if (lockedAfter > 0) {
    await userDoc(uid).set(
      {
        preferences: {
          slotSelectionConfirmedForPlan: plan.id,
        },
      },
      { merge: true }
    );
  }

  return listProjects(uid);
}

/** Elimina un proyecto. Disponible en todos los planes. */
export async function deleteProject(uid: string, projectId: string): Promise<ProjectsListResponse> {
  const doc = await projectDoc(uid, projectId).get();
  if (!doc.exists) {
    throw new Error('PROJECT_NOT_FOUND');
  }

  const allProjects = await fetchAllProjects(uid);
  const isLastProject = allProjects.length === 1;

  await projectDoc(uid, projectId).delete();

  if (isLastProject) {
    await clearSlotSelectionConfirmation(uid);
    await userDoc(uid).set(
      {
        preferences: {
          activeProjectId: FieldValue.delete(),
          lastAgent: '1',
        },
      },
      { merge: true }
    );
    const plan = await resolveUserPlan(uid);
    return {
      projects: [],
      activeProjectId: null,
      slots: buildSlotsInfo([], plan.limits.maxProjects, plan.id, undefined),
    };
  }

  const userSnapshot = await userDoc(uid).get();
  const prefs = userSnapshot.data()?.preferences as { activeProjectId?: string } | undefined;

  if (prefs?.activeProjectId === projectId) {
    const remaining = allProjects.filter((p) => p.id !== projectId);
    const next = remaining.find((p) => p.status === 'active') ?? remaining[0];
    await userDoc(uid).set(
      {
        preferences: {
          activeProjectId: next.id,
          lastAgent: next.lastAgent ?? '1',
        },
      },
      { merge: true }
    );
  }

  return listProjects(uid);
}

export async function writeProjectWorkspace(
  uid: string,
  projectId: string,
  workspacePatch: Record<string, unknown>
): Promise<void> {
  await requireUnlockedProject(uid, projectId);
  await projectDoc(uid, projectId).set(
    {
      workspace: workspacePatch,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function mergeProjectWorkspace(
  uid: string,
  projectId: string,
  partialWorkspace: Record<string, unknown>
): Promise<void> {
  await requireUnlockedProject(uid, projectId);
  const current = await getProjectWorkspace(uid, projectId);
  const merged = {
    ...current,
    ...partialWorkspace,
  };

  await projectDoc(uid, projectId).set(
    {
      workspace: merged,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function patchProjectWorkspaceFields(
  uid: string,
  projectId: string,
  fields: Record<string, unknown>
): Promise<void> {
  await requireUnlockedProject(uid, projectId);
  await projectDoc(uid, projectId).set(
    {
      ...fields,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getProjectGithubExport(
  uid: string,
  projectId: string
): Promise<GithubExportRecord | null> {
  const doc = await projectDoc(uid, projectId).get();
  if (!doc.exists) {
    throw new Error('PROJECT_NOT_FOUND');
  }
  const data = doc.data() as ProjectDocument;
  return data.githubExport ?? null;
}

export async function saveProjectGithubExport(
  uid: string,
  projectId: string,
  record: GithubExportRecord
): Promise<void> {
  await requireUnlockedProject(uid, projectId);
  await projectDoc(uid, projectId).set(
    {
      githubExport: record,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export { projectDoc, projectsCol, normalizeWorkspace };
