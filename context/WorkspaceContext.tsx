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
import type { Agent2State, Agent2Input, UserStory } from '@/lib/types/agent-2';
import type { Agent3State, StoryEstimation } from '@/lib/types/agent-3';
import type { Agent4State } from '@/lib/types/agent-4';
import type { Agent5State, SprintPlan } from '@/lib/types/agent-5';
import type { UserWorkspace, WorkspaceResponse, Agent3Input, Agent4Input, Agent5Input, Agent6Input } from '@/lib/types/workspace';

const SAVE_DEBOUNCE_MS = 500;

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
  createProject: (name?: string) => Promise<ProjectSummary>;
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
  createUserStory: (input: CreateDashboardUserStoryInput) => Promise<void>;
  deleteUserStory: (storyId: string) => Promise<void>;
  updateUserStory: (
    storyId: string,
    updates: Partial<UserStory>,
    estimationUpdates?: Partial<StoryEstimation>,
    options?: UpdateDashboardUserStoryOptions
  ) => Promise<void>;
  updateSprintPlan: (plan: SprintPlan) => Promise<void>;
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
  const lastPersistedAgent = useRef<string | null>(null);

  const cancelPendingSaves = useCallback(() => {
    if (agent1Timer.current) clearTimeout(agent1Timer.current);
    if (agent2Timer.current) clearTimeout(agent2Timer.current);
    if (agent3Timer.current) clearTimeout(agent3Timer.current);
    if (agent4Timer.current) clearTimeout(agent4Timer.current);
    agent4Abort.current?.abort();
    if (agent5Timer.current) clearTimeout(agent5Timer.current);
    agent5Abort.current?.abort();
  }, []);

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
      setWorkspace(data.workspace);
      setPlan(data.plan);
      setActiveProjectId(data.activeProjectId);
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

  const createProject = useCallback(
    async (name?: string) => {
      if (!user) throw new Error('No autenticado');
      const response = await authFetch('/api/projects', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
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
      cancelPendingSaves();
      const response = await authFetch('/api/projects', user, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'No se pudo cambiar de proyecto');
      }
      setActiveProjectId(projectId);
      setSessionVersion((v) => v + 1);
      await fetchWorkspace();
    },
    [user, cancelPendingSaves, fetchWorkspace]
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
    void fetchWorkspace();
    void refreshProjects();
  }, [fetchWorkspace, refreshProjects]);

  useEffect(() => {
    if (!user || !pathname?.startsWith('/agentes')) return;
    if (pathname === '/agentes/proyectos') return;
    if (isLoading) return;
    if (projects.length === 0 && !activeProjectId) {
      router.replace('/agentes/proyectos');
    }
  }, [user, pathname, projects.length, activeProjectId, isLoading, router]);

  // Al cambiar de agente, sincronizar con Firestore (el estado local no se
  // actualiza tras PATCH/POST; sin esto el Agente 2 no ve pipeline.agent2Input).
  useEffect(() => {
    if (!user || !pathname?.startsWith('/agentes')) return;
    void fetchWorkspace({ silent: true });
  }, [pathname, user, fetchWorkspace]);

  // Persistir el último agente visitado en preferencias (p. ej. tras login).
  useEffect(() => {
    if (!user || !pathname?.startsWith('/agentes')) return;

    if (pathname === '/agentes/dashboard' || pathname.startsWith('/agentes/dashboard/')) {
      if (lastPersistedAgent.current === 'dashboard') return;
      lastPersistedAgent.current = 'dashboard';
      void saveLastAgent(user, 'dashboard').catch(() => {
        lastPersistedAgent.current = null;
      });
      return;
    }

    const match = pathname.match(/^\/agentes\/(\d+)/);
    if (!match) return;

    const agentId = match[1];
    if (lastPersistedAgent.current === agentId) return;
    lastPersistedAgent.current = agentId;

    void saveLastAgent(user, agentId).catch(() => {
      lastPersistedAgent.current = null;
    });
  }, [pathname, user]);

  useEffect(() => {
    return () => cancelPendingSaves();
  }, [cancelPendingSaves]);

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
                agent6Input: null,
              },
            }
          : prev
      );
    },
    [runAction]
  );

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
      options?: UpdateDashboardUserStoryOptions
    ) => {
      if (!user) return;
      const response = await authFetch('/api/workspace', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateUserStory',
          payload: { storyId, updates, estimationUpdates, ...options },
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo actualizar la historia de usuario');
      }

      const data = (await response.json()) as { workspace?: UserWorkspace };
      if (data.workspace) {
        setWorkspace(data.workspace);
      }
    },
    [user]
  );

  const updateSprintPlan = useCallback(
    async (plan: SprintPlan) => {
      if (!user) return;
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

      const data = (await response.json()) as { workspace?: UserWorkspace };
      if (data.workspace) {
        setWorkspace(data.workspace);
      }
    },
    [user]
  );

  const createUserStory = useCallback(
    async (input: CreateDashboardUserStoryInput) => {
      if (!user) return;
      const response = await authFetch('/api/workspace', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createUserStory', payload: input }),
      });

      if (!response.ok) {
        throw new Error('No se pudo crear la historia de usuario');
      }

      const data = (await response.json()) as { workspace?: UserWorkspace };
      if (data.workspace) {
        setWorkspace(data.workspace);
      }
    },
    [user]
  );

  const deleteUserStory = useCallback(
    async (storyId: string) => {
      if (!user) return;
      const response = await authFetch('/api/workspace', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteUserStory', payload: { storyId } }),
      });

      if (!response.ok) {
        throw new Error('No se pudo eliminar la historia de usuario');
      }

      const data = (await response.json()) as { workspace?: UserWorkspace };
      if (data.workspace) {
        setWorkspace(data.workspace);
      }
    },
    [user]
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
        createUserStory,
        deleteUserStory,
        updateUserStory,
        updateSprintPlan,
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
