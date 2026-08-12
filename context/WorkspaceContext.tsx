/**
 * @fileoverview Contexto del workspace — estado compartido entre páginas de agentes.
 *
 * Provee lectura/escritura del workspace en Firestore, acciones de pipeline
 * y reset de sesión completa (MVP: un proyecto activo por usuario).
 */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authFetch, saveLastAgent } from '@/lib/api-client';
import { canRegenerateClient } from '@/lib/plans/regeneration-policy';
import type { RegenerationAgent } from '@/lib/plans/types';
import type { ProjectSlotsInfo, ProjectSummary } from '@/lib/types/project';
import { createEmptyWorkspace } from '@/lib/types/workspace';
import type { WorkspacePlanSnapshot } from '@/lib/types/workspace';
import type { Agent1State } from '@/lib/types/agent-1';
import type { Agent2State, Agent2Input, Epic, UserStory } from '@/lib/types/agent-2';
import type { Agent3State, StoryEstimation } from '@/lib/types/agent-3';
import type { Agent4State, FrameworkCategory, StoryPrioritization } from '@/lib/types/agent-4';
import type { Agent5State, SprintPlan } from '@/lib/types/agent-5';
import type { UserWorkspace, WorkspaceResponse, Agent3Input, Agent4Input, Agent5Input, Agent6Input } from '@/lib/types/workspace';
import type { KanbanStatus, ProjectMember, ProjectMemberInput } from '@/lib/types/execution';
import { buildInitialExecutionState } from '@/lib/board/board-utils';
import {
  buildAgent6InputFromAgent4,
  normalizeSprintPlan,
  withUpdatedSprintPlan,
} from '@/lib/utils/sprint-plan-mutations';
import {
  withCreatedEpic,
  withCreatedUserStory,
  withDeletedEpic,
  withDeletedUserStory,
  withUpdatedEpic,
  withUpdatedUserStory,
} from '@/lib/utils/user-story-mutations';

const SAVE_DEBOUNCE_MS = 500;
const BULK_REORDER_DEBOUNCE_MS = 400;
const SPRINT_PLAN_DEBOUNCE_MS = 350;

export interface UpdateDashboardUserStoryOptions {
  epicId?: string;
  sprintId?: string | null;
}

export interface CreateDashboardUserStoryInput {
  epicId: string;
  sprintId?: string | null;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  points: number;
  category?: FrameworkCategory;
}

export interface UseWorkspaceResult {
  workspace: UserWorkspace | null;
  isLoading: boolean;
  error: string | null;
  plan: WorkspacePlanSnapshot | null;
  activeProjectId: string | null;
  projects: ProjectSummary[];
  projectSlots: ProjectSlotsInfo | null;
  /** Incrementa tras resetear sesión; las páginas deben re-hidratar al cambiar */
  sessionVersion: number;
  /** Recarga el workspace desde Firestore (p. ej. al entrar a un agente) */
  refreshWorkspace: (options?: { silent?: boolean }) => Promise<void>;
  refreshProjects: () => Promise<void>;
  createProject: (name: string) => Promise<ProjectSummary>;
  switchProject: (projectId: string) => Promise<void>;
  activateProjects: (projectIds: string[]) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  canRegenerate: (agent: RegenerationAgent) => boolean;
  saveAgent1: (state: Agent1State) => void;
  saveAgent2: (state: Agent2State) => void;
  saveAgent3: (state: Agent3State) => void;
  saveAgent4: (state: Agent4State) => void;
  saveAgent5: (state: Agent5State) => void;
  approveAgent1: (input: Agent2Input) => Promise<void>;
  approveAgent2: (input: Agent3Input) => Promise<void>;
  approveAgent3: (input: Agent4Input) => Promise<void>;
  approveAgent4: (input: Agent5Input) => Promise<void>;
  approveAgent5: (input: Agent6Input) => Promise<void>;
  /** Materializa agent6Input si Agente 4 está aprobado y falta el plan (migración). */
  bootstrapDashboardFromAgent4: () => Promise<void>;
  createUserStory: (input: CreateDashboardUserStoryInput) => Promise<void>;
  deleteUserStory: (storyId: string) => Promise<void>;
  createEpic: (input: { title: string; description: string }) => Promise<void>;
  updateEpic: (epicId: string, updates: { title?: string; description?: string }) => Promise<void>;
  deleteEpic: (epicId: string) => Promise<void>;
  updateUserStory: (
    storyId: string,
    updates: Partial<UserStory>,
    estimationUpdates?: Partial<StoryEstimation>,
    options?: UpdateDashboardUserStoryOptions,
    prioritizationUpdates?: Partial<StoryPrioritization>
  ) => Promise<void>;
  updateSprintPlan: (plan: SprintPlan) => void;
  startSprint: (sprintId: string) => Promise<void>;
  completeSprint: (
    sprintId: string,
    rollover?: 'backlog' | 'next_planned'
  ) => Promise<void>;
  initializeExecution: () => Promise<void>;
  upsertMember: (member: ProjectMemberInput) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  updateStoryExecution: (
    storyId: string,
    patch: Partial<{ status: KanbanStatus; assigneeId: string | null; columnOrder: number }>
  ) => Promise<void>;
  bulkReorderExecutions: (
    updates: { storyId: string; status: KanbanStatus; columnOrder: number }[]
  ) => void;
  updateExecutionSprintFilter: (sprintFilter: string | 'all') => Promise<void>;
  resetAgent1: () => Promise<void>;
  resetAgent2: () => Promise<void>;
  resetAgent3: () => Promise<void>;
  resetAgent4: () => Promise<void>;
  resetAgent5: () => Promise<void>;
  /** Limpia todo el workspace en Firestore y redirige al Agente 1 */
  resetSession: () => Promise<void>;
}

const WorkspaceContext = createContext<UseWorkspaceResult | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState<UserWorkspace | null>(null);
  const [plan, setPlan] = useState<WorkspacePlanSnapshot | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectSlots, setProjectSlots] = useState<ProjectSlotsInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);

  const agent1Timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agent2Timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agent3Timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agent4Timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agent4Abort = useRef<AbortController | null>(null);
  const agent5Timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agent5Abort = useRef<AbortController | null>(null);
  const bulkReorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBulkReorder = useRef<
    { storyId: string; status: KanbanStatus; columnOrder: number }[] | null
  >(null);
  const sprintPlanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSprintPlan = useRef<SprintPlan | null>(null);
  const sprintPlanGeneration = useRef(0);
  const storyExecutionGeneration = useRef(0);
  const lastPersistedAgent = useRef<string | null>(null);
  const lastFetchedRouteKey = useRef<string | null>(null);
  const sprintFilterRequestId = useRef(0);
  const bootstrapInFlight = useRef<Promise<void> | null>(null);
  /** lastAgent conocido del servidor (evita PATCH innecesario al montar). */
  const serverLastAgent = useRef<string | null>(null);

  const cancelPendingSaves = useCallback(() => {
    if (agent1Timer.current) clearTimeout(agent1Timer.current);
    if (agent2Timer.current) clearTimeout(agent2Timer.current);
    if (agent3Timer.current) clearTimeout(agent3Timer.current);
    if (agent4Timer.current) clearTimeout(agent4Timer.current);
    agent4Abort.current?.abort();
    if (agent5Timer.current) clearTimeout(agent5Timer.current);
    agent5Abort.current?.abort();
    if (bulkReorderTimer.current) clearTimeout(bulkReorderTimer.current);
    bulkReorderTimer.current = null;
    if (sprintPlanTimer.current) clearTimeout(sprintPlanTimer.current);
    sprintPlanTimer.current = null;
  }, []);

  const persistBulkReorder = useCallback(async () => {
    if (bulkReorderTimer.current) {
      clearTimeout(bulkReorderTimer.current);
      bulkReorderTimer.current = null;
    }
    const payload = pendingBulkReorder.current;
    pendingBulkReorder.current = null;
    if (!payload || !user) return;

    const response = await authFetch('/api/workspace', user, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'bulkUpdateStoryExecutions',
        payload: { updates: payload },
      }),
    });
    if (!response.ok) {
      throw new Error('No se pudo guardar el orden del tablero');
    }
    await response.json();
  }, [user]);

  const persistSprintPlan = useCallback(async () => {
    if (sprintPlanTimer.current) {
      clearTimeout(sprintPlanTimer.current);
      sprintPlanTimer.current = null;
    }
    const plan = pendingSprintPlan.current;
    pendingSprintPlan.current = null;
    if (!plan || !user) return;

    const requestId = ++sprintPlanGeneration.current;
    const response = await authFetch('/api/workspace', user, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateSprintPlan',
        payload: { plan },
      }),
    });

    if (!response.ok) {
      throw new Error('No se pudo actualizar el plan de sprints');
    }

    await response.json();
    if (requestId !== sprintPlanGeneration.current) return;
  }, [user]);

  const fetchWorkspace = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) return;
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const response = await authFetch('/api/workspace', user);
      if (!response.ok) throw new Error('No se pudo cargar el workspace');
      const data = (await response.json()) as WorkspaceResponse;
      setWorkspace((prev) => {
        const incoming = data.workspace;
        const localStories = prev?.execution?.stories;
        const serverStories = incoming.execution?.stories;
        if (!localStories || !serverStories || !incoming.execution) return incoming;

        const mergedStories = { ...serverStories };
        for (const [storyId, local] of Object.entries(localStories)) {
          const server = serverStories[storyId];
          if (!server || local.updatedAt > server.updatedAt) {
            mergedStories[storyId] = local;
          }
        }

        return {
          ...incoming,
          execution: { ...incoming.execution, stories: mergedStories },
        };
      });
      setPlan(data.plan);
      setActiveProjectId(data.activeProjectId);
      if (data.preferences?.lastAgent) {
        serverLastAgent.current = data.preferences.lastAgent;
      }
    } catch (err) {
      if (!options?.silent) {
        setError(err instanceof Error ? err.message : 'Error al cargar el workspace');
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [user]);

  const refreshProjects = useCallback(async () => {
    if (!user) return;
    try {
      const response = await authFetch('/api/projects', user);
      if (!response.ok) throw new Error('No se pudieron cargar los proyectos');
      const data = (await response.json()) as {
        projects: ProjectSummary[];
        activeProjectId: string | null;
        slots: ProjectSlotsInfo;
        plan: WorkspacePlanSnapshot;
      };
      setProjects(data.projects);
      setActiveProjectId(data.activeProjectId);
      setProjectSlots(data.slots);
      setPlan(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proyectos');
    }
  }, [user]);

  const bootstrapWorkspace = useCallback(async () => {
    if (!user) return;
    if (bootstrapInFlight.current) {
      await bootstrapInFlight.current;
      return;
    }
    setIsLoading(true);
    setError(null);
    const promise = (async () => {
      try {
        // Esperar ambas cargas: si solo esperamos workspace, la UI muestra
        // "sin proyectos" mientras /api/projects sigue en vuelo.
        await Promise.all([fetchWorkspace({ silent: true }), refreshProjects()]);
      } finally {
        setIsLoading(false);
        bootstrapInFlight.current = null;
      }
    })();
    bootstrapInFlight.current = promise;
    await promise;
  }, [user, fetchWorkspace, refreshProjects]);

  const createProject = useCallback(
    async (name: string) => {
      if (!user) throw new Error('No autenticado');
      const trimmed = name.trim();
      if (!trimmed) throw new Error('El nombre del proyecto es obligatorio');
      const response = await authFetch('/api/projects', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'No se pudo crear el proyecto');
      }
      const data = (await response.json()) as {
        project: ProjectSummary;
        activeProjectId: string;
        plan: WorkspacePlanSnapshot;
      };
      setProjects((prev) => [data.project, ...prev.filter((p) => p.id !== data.project.id)]);
      setActiveProjectId(data.activeProjectId);
      setPlan(data.plan);
      setWorkspace(createEmptyWorkspace());
      setSessionVersion((v) => v + 1);
      return data.project;
    },
    [user]
  );

  const switchProject = useCallback(
    async (projectId: string) => {
      if (!user) return;
      await Promise.all([
        persistBulkReorder().catch(() => undefined),
        persistSprintPlan().catch(() => undefined),
      ]);
      cancelPendingSaves();
      setIsLoading(true);
      setError(null);
      try {
        const response = await authFetch('/api/projects', user, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        });
        if (!response.ok) {
          const err = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? 'No se pudo cambiar de proyecto');
        }
        const data = (await response.json()) as WorkspaceResponse & {
          project: ProjectSummary;
          activeProjectId: string;
        };
        setWorkspace(data.workspace);
        setPlan(data.plan);
        setActiveProjectId(data.activeProjectId);
        if (data.preferences?.lastAgent) {
          serverLastAgent.current = data.preferences.lastAgent;
          lastPersistedAgent.current = data.preferences.lastAgent;
        }
        setSessionVersion((v) => v + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cambiar de proyecto');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user, cancelPendingSaves, persistBulkReorder, persistSprintPlan]
  );

  const activateProjects = useCallback(
    async (projectIds: string[]) => {
      if (!user) throw new Error('No autenticado');
      const response = await authFetch('/api/projects', user, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', projectIds }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'No se pudieron activar los proyectos');
      }
      const data = (await response.json()) as {
        projects: ProjectSummary[];
        activeProjectId: string | null;
        slots: ProjectSlotsInfo;
        plan: WorkspacePlanSnapshot;
      };
      setProjects(data.projects);
      setActiveProjectId(data.activeProjectId);
      setProjectSlots(data.slots);
      setPlan(data.plan);
    },
    [user]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!user) throw new Error('No autenticado');
      const wasActive = activeProjectId === projectId;
      if (wasActive) {
        cancelPendingSaves();
      }

      const response = await authFetch(
        `/api/projects?projectId=${encodeURIComponent(projectId)}`,
        user,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'No se pudo eliminar el proyecto');
      }

      const data = (await response.json()) as {
        projects: ProjectSummary[];
        activeProjectId: string | null;
        slots: ProjectSlotsInfo;
        plan: WorkspacePlanSnapshot;
      };

      setProjects(data.projects);
      setActiveProjectId(data.activeProjectId);
      setProjectSlots(data.slots);
      setPlan(data.plan);

      if (wasActive) {
        setSessionVersion((v) => v + 1);
        if (pathname?.startsWith('/agentes') && pathname !== '/agentes/proyectos') {
          router.push('/agentes/proyectos');
        } else {
          await fetchWorkspace({ silent: true });
        }
      }
    },
    [user, activeProjectId, cancelPendingSaves, pathname, router, fetchWorkspace]
  );

  const canRegenerate = useCallback(
    (agent: RegenerationAgent) => {
      if (!plan) return false;
      return canRegenerateClient(plan.id, agent, plan.usage).allowed;
    },
    [plan]
  );

  useEffect(() => {
    if (!user) {
      setWorkspace(null);
      setProjects([]);
      setProjectSlots(null);
      setActiveProjectId(null);
      setPlan(null);
      setIsLoading(false);
      serverLastAgent.current = null;
      lastPersistedAgent.current = null;
      bootstrapInFlight.current = null;
      return;
    }
    void bootstrapWorkspace();
  }, [user, bootstrapWorkspace]);

  useEffect(() => {
    if (!user || !pathname?.startsWith('/agentes')) return;
    if (pathname === '/agentes/proyectos') return;
    if (isLoading) return;
    if (projects.length === 0 && !activeProjectId) {
      router.replace('/agentes/proyectos');
    }
  }, [user, pathname, projects.length, activeProjectId, isLoading, router]);

  // Al cambiar de ruta de agente, sincronizar con Firestore (evita refetch duplicado al montar).
  useEffect(() => {
    if (!user || !pathname?.startsWith('/agentes')) return;
    if (pathname === '/agentes/proyectos') return;

    const routeKey =
      pathname.match(/^\/agentes\/(\d+)/)?.[1] ??
      (pathname.startsWith('/agentes/board') ? 'board' : null) ??
      (pathname.startsWith('/agentes/dashboard') ? 'dashboard' : null);

    if (!routeKey) return;
    if (lastFetchedRouteKey.current === routeKey) return;
    lastFetchedRouteKey.current = routeKey;

    // La carga inicial ya la hace fetchWorkspace() al montar; no repetir en la primera ruta.
    if (isLoading) return;

    void (async () => {
      if (pendingBulkReorder.current) {
        await persistBulkReorder().catch(() => undefined);
      }
      await fetchWorkspace({ silent: true });
    })();
  }, [pathname, user, fetchWorkspace, isLoading, persistBulkReorder]);

  // Persistir el último agente visitado en preferencias (p. ej. tras login).
  useEffect(() => {
    if (!user || !pathname?.startsWith('/agentes')) return;
    // Esperar bootstrap para comparar contra preferences del servidor.
    if (isLoading) return;

    const persistIfChanged = (agentKey: string) => {
      if (lastPersistedAgent.current === agentKey) return;
      // Evita write si el servidor ya tiene este valor (p. ej. reentrada al dashboard).
      if (serverLastAgent.current === agentKey) {
        lastPersistedAgent.current = agentKey;
        return;
      }
      lastPersistedAgent.current = agentKey;
      void saveLastAgent(user, agentKey)
        .then(() => {
          serverLastAgent.current = agentKey;
        })
        .catch(() => {
          lastPersistedAgent.current = null;
        });
    };

    if (pathname === '/agentes/dashboard' || pathname.startsWith('/agentes/dashboard/')) {
      persistIfChanged('dashboard');
      return;
    }

    const match = pathname.match(/^\/agentes\/(\d+)/);
    if (!match) return;
    persistIfChanged(match[1]);
  }, [pathname, user, isLoading]);

  useEffect(() => {
    const flushOnUnload = () => {
      if (!user) return;

      const sendKeepalive = (body: string) => {
        void user.getIdToken().then((token) => {
          fetch('/api/workspace', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body,
            keepalive: true,
          });
        });
      };

      if (pendingBulkReorder.current) {
        const payload = pendingBulkReorder.current;
        pendingBulkReorder.current = null;
        if (bulkReorderTimer.current) {
          clearTimeout(bulkReorderTimer.current);
          bulkReorderTimer.current = null;
        }
        sendKeepalive(
          JSON.stringify({
            action: 'bulkUpdateStoryExecutions',
            payload: { updates: payload },
          })
        );
      }

      if (pendingSprintPlan.current) {
        const plan = pendingSprintPlan.current;
        pendingSprintPlan.current = null;
        if (sprintPlanTimer.current) {
          clearTimeout(sprintPlanTimer.current);
          sprintPlanTimer.current = null;
        }
        sendKeepalive(
          JSON.stringify({
            action: 'updateSprintPlan',
            payload: { plan },
          })
        );
      }
    };

    window.addEventListener('pagehide', flushOnUnload);
    return () => {
      window.removeEventListener('pagehide', flushOnUnload);
      void persistBulkReorder().catch(() => undefined);
      void persistSprintPlan().catch(() => undefined);
      cancelPendingSaves();
    };
  }, [cancelPendingSaves, persistBulkReorder, persistSprintPlan, user]);

  const saveAgent1 = useCallback(
    (state: Agent1State) => {
      if (!user) return;
      if (agent1Timer.current) clearTimeout(agent1Timer.current);
      agent1Timer.current = setTimeout(() => {
        void authFetch('/api/workspace', user, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: 'agent1', data: state }),
        }).catch(() => {
          /* el siguiente guardado reintentará */
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [user]
  );

  const saveAgent2 = useCallback(
    (state: Agent2State) => {
      if (!user) return;
      if (agent2Timer.current) clearTimeout(agent2Timer.current);
      agent2Timer.current = setTimeout(() => {
        void authFetch('/api/workspace', user, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: 'agent2', data: state }),
        }).catch(() => {
          /* el siguiente guardado reintentará */
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [user]
  );

  const saveAgent3 = useCallback(
    (state: Agent3State) => {
      if (!user) return;
      if (agent3Timer.current) clearTimeout(agent3Timer.current);
      agent3Timer.current = setTimeout(() => {
        void authFetch('/api/workspace', user, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: 'agent3', data: state }),
        }).catch(() => {
          /* el siguiente guardado reintentará */
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [user]
  );

  const saveAgent4 = useCallback(
    (state: Agent4State) => {
      if (!user) return;
      if (agent4Timer.current) clearTimeout(agent4Timer.current);
      agent4Abort.current?.abort();
      agent4Timer.current = setTimeout(() => {
        const controller = new AbortController();
        agent4Abort.current = controller;
        void authFetch('/api/workspace', user, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: 'agent4', data: state }),
          signal: controller.signal,
        }).catch(() => {
          /* el siguiente guardado reintentará */
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [user]
  );

  const saveAgent5 = useCallback(
    (state: Agent5State) => {
      if (!user) return;
      if (agent5Timer.current) clearTimeout(agent5Timer.current);
      agent5Abort.current?.abort();
      agent5Timer.current = setTimeout(() => {
        const controller = new AbortController();
        agent5Abort.current = controller;
        void authFetch('/api/workspace', user, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: 'agent5', data: state }),
          signal: controller.signal,
        }).catch(() => {
          /* el siguiente guardado reintentará */
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [user]
  );

  const runActionWithWorkspace = useCallback(
    async (action: string, payload?: unknown): Promise<UserWorkspace | null> => {
      if (!user) return null;
      const response = await authFetch('/api/workspace', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      if (!response.ok) {
        let message = 'No se pudo actualizar el workspace';
        try {
          const err = (await response.json()) as { error?: string };
          if (err.error?.trim()) message = err.error.trim();
        } catch {
          /* keep fallback */
        }
        throw new Error(message);
      }
      const data = (await response.json()) as { workspace?: UserWorkspace };
      return data.workspace ?? null;
    },
    [user]
  );

  const runAction = useCallback(
    async (action: string, payload?: unknown) => {
      if (!user) return;
      const response = await authFetch('/api/workspace', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      if (!response.ok) {
        throw new Error('No se pudo actualizar el workspace');
      }
    },
    [user]
  );

  const approveAgent1 = useCallback(
    async (input: Agent2Input) => {
      await runAction('approveAgent1', input);
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              agent1: {
                ...prev.agent1,
                transcription: input.transcription,
                wishes: input.wishes,
                status: 'approved',
                error: null,
              },
              pipeline: { ...prev.pipeline, agent2Input: input },
            }
          : prev
      );
    },
    [runAction]
  );
  const approveAgent2 = useCallback(
    async (input: Agent3Input) => {
      await runAction('approveAgent2', input);
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              agent2: { ...prev.agent2, status: 'approved' },
              pipeline: { ...prev.pipeline, agent3Input: input },
            }
          : prev
      );
    },
    [runAction]
  );

  const approveAgent3 = useCallback(
    async (input: Agent4Input) => {
      if (agent3Timer.current) clearTimeout(agent3Timer.current);
      await runAction('approveAgent3', input);
      const agent3Input: Agent3Input = {
        epics: input.epics,
        sourceWishIds: input.sourceWishIds,
        approvedAt: input.approvedAt,
      };
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              agent3: {
                ...prev.agent3,
                input: agent3Input,
                estimations: input.estimations,
                status: 'approved',
                error: null,
              },
              pipeline: { ...prev.pipeline, agent4Input: input },
            }
          : prev
      );
    },
    [runAction]
  );

  const approveAgent4 = useCallback(
    async (input: Agent5Input) => {
      if (agent4Timer.current) clearTimeout(agent4Timer.current);
      await runAction('approveAgent4', input);
      const agent4Input: Agent4Input = {
        epics: input.epics,
        estimations: input.estimations,
        sourceWishIds: input.sourceWishIds,
        approvedAt: input.approvedAt,
      };
      const agent6Input = buildAgent6InputFromAgent4(input);
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              agent4: {
                ...prev.agent4,
                input: agent4Input,
                priorities: input.priorities,
                framework: input.framework,
                status: 'approved',
                error: null,
              },
              agent5: createEmptyWorkspace().agent5,
              pipeline: {
                ...prev.pipeline,
                agent5Input: input,
                agent6Input,
              },
              execution: buildInitialExecutionState(agent6Input.epics),
            }
          : prev
      );
    },
    [runAction]
  );

  const bootstrapDashboardFromAgent4 = useCallback(async () => {
    if (!user) return;
    const res = await authFetch('/api/workspace', user, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bootstrapDashboardFromAgent4' }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? 'No se pudo inicializar el dashboard');
    }
    const data = (await res.json()) as { workspace?: UserWorkspace };
    if (data.workspace) {
      setWorkspace(data.workspace);
    }
  }, [user]);

  const approveAgent5 = useCallback(
    async (input: Agent6Input) => {
      if (agent5Timer.current) clearTimeout(agent5Timer.current);
      await runAction('approveAgent5', input);
      const agent5Input: Agent5Input = {
        epics: input.epics,
        estimations: input.estimations,
        priorities: input.priorities,
        framework: input.framework,
        sourceWishIds: input.sourceWishIds,
        approvedAt: input.approvedAt,
      };
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              agent5: {
                ...prev.agent5,
                input: agent5Input,
                plan: input.plan,
                status: 'approved',
                error: null,
              },
              pipeline: { ...prev.pipeline, agent6Input: input },
              execution: buildInitialExecutionState(input.epics),
            }
          : prev
      );
    },
    [runAction]
  );

  const updateUserStory = useCallback(
    async (
      storyId: string,
      updates: Partial<UserStory>,
      estimationUpdates?: Partial<StoryEstimation>,
      options?: UpdateDashboardUserStoryOptions,
      prioritizationUpdates?: Partial<StoryPrioritization>
    ) => {
      if (!user) return;

      let previous: UserWorkspace | null = null;
      // Optimistic UI: la tabla se actualiza al instante; Firestore sigue en segundo plano.
      setWorkspace((prev) => {
        previous = prev;
        return prev
          ? withUpdatedUserStory(
              prev,
              storyId,
              updates,
              estimationUpdates,
              options,
              prioritizationUpdates
            )
          : prev;
      });

      try {
        const response = await authFetch('/api/workspace', user, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateUserStory',
            payload: { storyId, updates, estimationUpdates, prioritizationUpdates, ...options },
          }),
        });

        if (!response.ok) {
          throw new Error('No se pudo actualizar la historia de usuario');
        }
      } catch (error) {
        if (previous) setWorkspace(previous);
        throw error;
      }
    },
    [user]
  );

  const updateSprintPlan = useCallback(
    (plan: SprintPlan) => {
      if (!user) return;
      const normalizedPlan = normalizeSprintPlan(plan);

      // Optimistic UI: la historia salta de sprint al instante.
      setWorkspace((prev) => (prev ? withUpdatedSprintPlan(prev, normalizedPlan) : prev));

      pendingSprintPlan.current = normalizedPlan;
      if (sprintPlanTimer.current) clearTimeout(sprintPlanTimer.current);
      sprintPlanTimer.current = setTimeout(() => {
        void persistSprintPlan().catch(() => {
          /* el siguiente cambio reintentará */
        });
      }, SPRINT_PLAN_DEBOUNCE_MS);
    },
    [user, persistSprintPlan]
  );

  const startSprint = useCallback(
    async (sprintId: string) => {
      if (!user) return;
      await persistSprintPlan().catch(() => undefined);
      const ws = await runActionWithWorkspace('startSprint', { sprintId });
      if (ws) setWorkspace(ws);
    },
    [user, persistSprintPlan, runActionWithWorkspace]
  );

  const completeSprint = useCallback(
    async (sprintId: string, rollover: 'backlog' | 'next_planned' = 'backlog') => {
      if (!user) return;
      await persistSprintPlan().catch(() => undefined);
      const ws = await runActionWithWorkspace('completeSprint', { sprintId, rollover });
      if (ws) setWorkspace(ws);
    },
    [user, persistSprintPlan, runActionWithWorkspace]
  );

  const postWorkspaceAction = useCallback(
    async <T,>(action: string, payload: unknown, fallbackError: string): Promise<T> => {
      if (!user) throw new Error(fallbackError);
      const response = await authFetch('/api/workspace', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
      if (!response.ok) {
        throw new Error(data?.error ?? fallbackError);
      }
      return (data ?? {}) as T;
    },
    [user]
  );

  const createUserStory = useCallback(
    async (input: CreateDashboardUserStoryInput) => {
      if (!user) return;
      const { storyId } = await postWorkspaceAction<{ storyId?: string }>(
        'createUserStory',
        input,
        'No se pudo crear la historia de usuario'
      );
      if (!storyId) {
        throw new Error('No se pudo crear la historia de usuario');
      }
      const story: UserStory = {
        id: storyId,
        title: input.title,
        description: input.description,
        acceptanceCriteria: input.acceptanceCriteria,
        sourceWishIds: [],
        source: 'manual',
        isEdited: false,
        createdAt: Date.now(),
      };
      setWorkspace((prev) =>
        prev
          ? withCreatedUserStory(prev, {
              story,
              epicId: input.epicId,
              sprintId: input.sprintId,
              estimation: {
                points: input.points,
                justification: 'Estimacion creada manualmente desde el dashboard.',
                isModified: true,
              },
              prioritization: input.category
                ? {
                    category: input.category,
                    justification: 'Priorizacion creada manualmente desde el dashboard.',
                    isModified: true,
                  }
                : null,
            })
          : prev
      );
    },
    [postWorkspaceAction, user]
  );

  const deleteUserStory = useCallback(
    async (storyId: string) => {
      if (!user) return;
      let previous: UserWorkspace | null = null;
      setWorkspace((prev) => {
        previous = prev;
        return prev ? withDeletedUserStory(prev, storyId) : prev;
      });
      try {
        await postWorkspaceAction('deleteUserStory', { storyId }, 'No se pudo eliminar la historia de usuario');
      } catch (error) {
        if (previous) setWorkspace(previous);
        throw error;
      }
    },
    [postWorkspaceAction, user]
  );

  const createEpic = useCallback(
    async (input: { title: string; description: string }) => {
      if (!user) return;
      const { epicId } = await postWorkspaceAction<{ epicId?: string }>(
        'createEpic',
        input,
        'No se pudo crear la épica'
      );
      if (!epicId) {
        throw new Error('No se pudo crear la épica');
      }
      const epic: Epic = {
        id: epicId,
        title: input.title.trim(),
        description: input.description.trim(),
        userStories: [],
        source: 'manual',
        isEdited: false,
        createdAt: Date.now(),
      };
      setWorkspace((prev) => (prev ? withCreatedEpic(prev, epic) : prev));
    },
    [postWorkspaceAction, user]
  );

  const updateEpic = useCallback(
    async (epicId: string, updates: { title?: string; description?: string }) => {
      if (!user) return;
      let previous: UserWorkspace | null = null;
      setWorkspace((prev) => {
        previous = prev;
        return prev ? withUpdatedEpic(prev, epicId, updates) : prev;
      });
      try {
        await postWorkspaceAction(
          'updateEpic',
          { epicId, ...updates },
          'No se pudo actualizar la épica'
        );
      } catch (error) {
        if (previous) setWorkspace(previous);
        throw error;
      }
    },
    [postWorkspaceAction, user]
  );

  const deleteEpic = useCallback(
    async (epicId: string) => {
      if (!user) return;
      let previous: UserWorkspace | null = null;
      setWorkspace((prev) => {
        previous = prev;
        return prev ? withDeletedEpic(prev, epicId) : prev;
      });
      try {
        await postWorkspaceAction('deleteEpic', { epicId }, 'No se pudo eliminar la épica');
      } catch (error) {
        if (previous) setWorkspace(previous);
        throw error;
      }
    },
    [postWorkspaceAction, user]
  );

  const initializeExecution = useCallback(async () => {
    const ws = await runActionWithWorkspace('initializeExecution');
    if (ws) setWorkspace(ws);
  }, [runActionWithWorkspace]);

  const upsertMember = useCallback(
    async (member: ProjectMemberInput) => {
      const ws = await runActionWithWorkspace('upsertProjectMember', { member });
      if (ws) setWorkspace(ws);
    },
    [runActionWithWorkspace]
  );

  const deleteMember = useCallback(
    async (memberId: string) => {
      const ws = await runActionWithWorkspace('deleteProjectMember', { memberId });
      if (ws) setWorkspace(ws);
    },
    [runActionWithWorkspace]
  );

  const updateStoryExecution = useCallback(
    async (
      storyId: string,
      patch: Partial<{ status: KanbanStatus; assigneeId: string | null; columnOrder: number }>
    ) => {
      const requestId = ++storyExecutionGeneration.current;
      setWorkspace((prev) => {
        if (!prev?.execution) return prev;
        const current = prev.execution.stories[storyId];
        if (!current) return prev;
        return {
          ...prev,
          execution: {
            ...prev.execution,
            stories: {
              ...prev.execution.stories,
              [storyId]: { ...current, ...patch, updatedAt: Date.now() },
            },
          },
        };
      });

      const ws = await runActionWithWorkspace('updateStoryExecution', { storyId, patch });
      if (!ws?.execution || requestId !== storyExecutionGeneration.current) return;

      const serverStory = ws.execution.stories[storyId];
      if (!serverStory) return;

      setWorkspace((prev) => {
        if (!prev?.execution) return prev;
        const local = prev.execution.stories[storyId];
        if (!local) return prev;
        // Conservar layout/campos locales; solo traer activity del servidor.
        if (local.activity === serverStory.activity) return prev;
        return {
          ...prev,
          execution: {
            ...prev.execution,
            stories: {
              ...prev.execution.stories,
              [storyId]: { ...local, activity: serverStory.activity },
            },
          },
        };
      });
    },
    [runActionWithWorkspace]
  );

  const bulkReorderExecutions = useCallback(
    (updates: { storyId: string; status: KanbanStatus; columnOrder: number }[]) => {
      setWorkspace((prev) => {
        if (!prev?.execution) return prev;
        const stories = { ...prev.execution.stories };
        const now = Date.now();
        for (const update of updates) {
          const current =
            stories[update.storyId] ??
            ({
              status: 'todo' as const,
              assigneeId: null,
              columnOrder: update.columnOrder,
              updatedAt: now,
              activity: [],
            });
          stories[update.storyId] = {
            ...current,
            status: update.status,
            columnOrder: update.columnOrder,
            updatedAt: now,
          };
        }
        return { ...prev, execution: { ...prev.execution, stories } };
      });

      pendingBulkReorder.current = updates;
      if (bulkReorderTimer.current) clearTimeout(bulkReorderTimer.current);
      bulkReorderTimer.current = setTimeout(() => {
        void persistBulkReorder().catch(() => {
          /* el siguiente drag reintentará */
        });
      }, BULK_REORDER_DEBOUNCE_MS);
    },
    [persistBulkReorder]
  );

  const updateExecutionSprintFilter = useCallback(
    async (sprintFilter: string | 'all') => {
      const requestId = ++sprintFilterRequestId.current;
      setWorkspace((prev) =>
        prev?.execution
          ? { ...prev, execution: { ...prev.execution, sprintFilter } }
          : prev
      );
      const ws = await runActionWithWorkspace('updateExecutionSprintFilter', { sprintFilter });
      if (ws && requestId === sprintFilterRequestId.current) {
        setWorkspace(ws);
      }
    },
    [runActionWithWorkspace]
  );

  const resetAgent1 = useCallback(() => runAction('resetAgent1'), [runAction]);
  const resetAgent2 = useCallback(() => runAction('resetAgent2'), [runAction]);
  const resetAgent3 = useCallback(() => runAction('resetAgent3'), [runAction]);
  const resetAgent4 = useCallback(() => runAction('resetAgent4'), [runAction]);
  const resetAgent5 = useCallback(() => runAction('resetAgent5'), [runAction]);

  const resetSession = useCallback(async () => {
    if (!user) return;
    cancelPendingSaves();
    router.push('/agentes/proyectos');
  }, [user, cancelPendingSaves, router]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        isLoading,
        error,
        plan,
        activeProjectId,
        projects,
        projectSlots,
        sessionVersion,
        refreshWorkspace: fetchWorkspace,
        refreshProjects,
        createProject,
        switchProject,
        activateProjects,
        deleteProject,
        canRegenerate,
        saveAgent1,
        saveAgent2,
        saveAgent3,
        saveAgent4,
        saveAgent5,
        approveAgent1,
        approveAgent2,
        approveAgent3,
        approveAgent4,
        approveAgent5,
        bootstrapDashboardFromAgent4,
        createUserStory,
        deleteUserStory,
        createEpic,
        updateEpic,
        deleteEpic,
        updateUserStory,
        updateSprintPlan,
        startSprint,
        completeSprint,
        initializeExecution,
        upsertMember,
        deleteMember,
        updateStoryExecution,
        bulkReorderExecutions,
        updateExecutionSprintFilter,
        resetAgent1,
        resetAgent2,
        resetAgent3,
        resetAgent4,
        resetAgent5,
        resetSession,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): UseWorkspaceResult {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace debe usarse dentro de WorkspaceProvider');
  }
  return ctx;
}
