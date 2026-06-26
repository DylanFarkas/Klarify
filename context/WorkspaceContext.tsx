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
import { createEmptyWorkspace } from '@/lib/types/workspace';
import type { Agent1State } from '@/lib/types/agent-1';
import type { Agent2State, Agent2Input } from '@/lib/types/agent-2';
import type { UserWorkspace, WorkspaceResponse, Agent3Input } from '@/lib/types/workspace';

const SAVE_DEBOUNCE_MS = 500;

export interface UseWorkspaceResult {
  workspace: UserWorkspace | null;
  isLoading: boolean;
  error: string | null;
  /** Incrementa tras resetear sesión; las páginas deben re-hidratar al cambiar */
  sessionVersion: number;
  /** Recarga el workspace desde Firestore (p. ej. al entrar a un agente) */
  refreshWorkspace: (options?: { silent?: boolean }) => Promise<void>;
  saveAgent1: (state: Agent1State) => void;
  saveAgent2: (state: Agent2State) => void;
  approveAgent1: (input: Agent2Input) => Promise<void>;
  approveAgent2: (input: Agent3Input) => Promise<void>;
  resetAgent1: () => Promise<void>;
  resetAgent2: () => Promise<void>;
  /** Limpia todo el workspace en Firestore y redirige al Agente 1 */
  resetSession: () => Promise<void>;
}

const WorkspaceContext = createContext<UseWorkspaceResult | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState<UserWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);

  const agent1Timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agent2Timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedAgent = useRef<string | null>(null);

  const cancelPendingSaves = useCallback(() => {
    if (agent1Timer.current) clearTimeout(agent1Timer.current);
    if (agent2Timer.current) clearTimeout(agent2Timer.current);
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

  useEffect(() => {
    void fetchWorkspace();
  }, [fetchWorkspace]);

  // Al cambiar de agente, sincronizar con Firestore (el estado local no se
  // actualiza tras PATCH/POST; sin esto el Agente 2 no ve pipeline.agent2Input).
  useEffect(() => {
    if (!user || !pathname?.startsWith('/agentes')) return;
    void fetchWorkspace({ silent: true });
  }, [pathname, user, fetchWorkspace]);

  // Persistir el último agente visitado en preferencias (p. ej. tras login).
  useEffect(() => {
    if (!user || !pathname?.startsWith('/agentes')) return;

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
  const resetAgent1 = useCallback(() => runAction('resetAgent1'), [runAction]);
  const resetAgent2 = useCallback(() => runAction('resetAgent2'), [runAction]);

  const resetSession = useCallback(async () => {
    if (!user) return;
    cancelPendingSaves();
    await runAction('resetWorkspace');
    setWorkspace(createEmptyWorkspace());
    setSessionVersion((v) => v + 1);
    lastPersistedAgent.current = '1';
    router.push('/agentes/1');
  }, [user, cancelPendingSaves, runAction, router]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        isLoading,
        error,
        sessionVersion,
        refreshWorkspace: fetchWorkspace,
        saveAgent1,
        saveAgent2,
        approveAgent1,
        approveAgent2,
        resetAgent1,
        resetAgent2,
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