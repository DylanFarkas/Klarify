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
import { SCHEMA_VERSION_CURRENT } from '@/lib/types/project-schema';
import { createEmptyWorkspace, type UserWorkspace } from '@/lib/types/workspace';
import { computePipelineProgress } from '@/lib/utils/project-progress';
import { normalizeWorkspace, workspaceMetaFromWorkspace } from '@/lib/project-schema';
import {
  deleteProjectSlices,
  loadWorkspace,
  persistWorkspace,
  projectRef,
  projectsColRef,
  userDocRef,
} from '@/lib/project-store';

function userDoc(uid: string) {
  return userDocRef(uid);
}

function projectsCol(uid: string) {
  return projectsColRef(uid);
}

function projectDoc(uid: string, projectId: string) {
  return projectRef(uid, projectId);
}

function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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
 * Resuelve el proyecto activo junto al snapshot de su documento.
 *
 * Devolver el snapshot evita que `loadWorkspace` vuelva a leer el mismo
 * documento en cada petición. Es `null` cuando el proyecto acaba de migrarse.
 */
export async function resolveActiveProject(
  uid: string,
  preloadedUserSnapshot?: DocumentSnapshot
): Promise<{
  projectId: string;
  snapshot: DocumentSnapshot | null;
  userSnapshot: DocumentSnapshot;
} | null> {
  const userSnapshot = preloadedUserSnapshot ?? (await ensureUserAccount(uid));
  const preferredId =
    (userSnapshot.data()?.preferences as { activeProjectId?: string } | undefined)
      ?.activeProjectId ?? null;

  if (preferredId) {
    const doc = await projectDoc(uid, preferredId).get();
    if (doc.exists) {
      const status = normalizeProjectStatus((doc.data() as ProjectDocument).status);
      if (status === 'active') {
        assertProjectSlotAccessible(status);
        return { projectId: preferredId, snapshot: doc, userSnapshot };
      }
    }
  }

  const activeSnap = await projectsCol(uid).where('status', '==', 'active').limit(1).get();
  if (!activeSnap.empty) {
    const doc = activeSnap.docs[0];
    if (doc.id !== preferredId) {
      await userDoc(uid).set(
        { preferences: { activeProjectId: doc.id } },
        { merge: true }
      );
    }
    assertProjectSlotAccessible(normalizeProjectStatus((doc.data() as ProjectDocument).status));
    return { projectId: doc.id, snapshot: doc, userSnapshot };
  }

  const anyProject = await projectsCol(uid).limit(1).get();
  if (anyProject.empty) {
    const migratedId = await migrateLegacyWorkspace(uid);
    return migratedId ? { projectId: migratedId, snapshot: null, userSnapshot } : null;
  }

  return null;
}

/**
 * Resuelve el ID del proyecto activo sin hidratar el workspace.
 */
export async function readActiveProjectId(
  uid: string,
  preloadedUserSnapshot?: DocumentSnapshot
): Promise<string | null> {
  const resolved = await resolveActiveProject(uid, preloadedUserSnapshot);
  return resolved?.projectId ?? null;
}

/**
 * Carga el proyecto activo y su workspace (schema v4 + migración lazy).
 */
export async function loadActiveProjectWorkspace(
  uid: string,
  preloadedUserSnapshot?: DocumentSnapshot,
  scope: import('@/lib/types/project-schema').WorkspaceScope = 'full',
  pipelineAgent?: string
): Promise<{ projectId: string; workspace: UserWorkspace } | null> {
  const resolved = await resolveActiveProject(uid, preloadedUserSnapshot);
  if (!resolved) return null;
  const workspace = await loadWorkspace(
    uid,
    resolved.projectId,
    scope,
    pipelineAgent,
    resolved.snapshot ?? undefined
  );
  return { projectId: resolved.projectId, workspace };
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
    schemaVersion: SCHEMA_VERSION_CURRENT,
    workspaceMeta: workspaceMetaFromWorkspace(workspace),
    ...progress,
  });
  await persistWorkspace(uid, projectId, workspace);

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
  projectId: string,
  scope: import('@/lib/types/project-schema').WorkspaceScope = 'shell',
  pipelineAgent?: string
): Promise<UserWorkspace> {
  return loadWorkspace(uid, projectId, scope, pipelineAgent);
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
    schemaVersion: SCHEMA_VERSION_CURRENT,
    workspaceMeta: workspaceMetaFromWorkspace(emptyWorkspace),
    ...progress,
  });
  await persistWorkspace(uid, projectId, emptyWorkspace);

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
    workspace: await loadWorkspace(uid, projectId, 'full'),
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

  await deleteProjectSlices(uid, projectId);
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
  const current = await getProjectWorkspace(uid, projectId);
  const merged = {
    ...current,
    ...workspacePatch,
  } as UserWorkspace;
  await persistWorkspace(uid, projectId, normalizeWorkspace(merged));
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
  } as UserWorkspace;
  await persistWorkspace(uid, projectId, normalizeWorkspace(merged));
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
