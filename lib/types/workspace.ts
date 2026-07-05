/**
 * @fileoverview Tipos del workspace persistido en Firestore.
 *
 * El workspace vive en `users/{uid}.workspace` y guarda el estado del
 * pipeline de agentes además del puente entre ellos. Es el reemplazo
 * de las claves de localStorage que antes mantenían este estado en el navegador.
 */

import type { Agent1State } from '@/lib/types/agent-1';
import type { Agent2State, Agent2Input, Epic } from '@/lib/types/agent-2';
import type { Agent3State, StoryEstimation } from '@/lib/types/agent-3';
import type {
  Agent4State,
  StoryPrioritization,
  PrioritizationFramework,
} from '@/lib/types/agent-4';
import type { Agent5State, SprintPlan } from '@/lib/types/agent-5';

/** Input que el Agente 2 entrega al Agente 3 al aprobar el backlog */
export interface Agent3Input {
  epics: Epic[];
  sourceWishIds: string[];
  approvedAt: number;
}

/** Input que el Agente 3 entrega al Agente 4 al consolidar estimaciones */
export interface Agent4Input {
  epics: Epic[];
  estimations: Record<string, StoryEstimation>;
  sourceWishIds: string[];
  approvedAt: number;
}

/** Input que el Agente 4 entrega al Agente 5 al priorizar el backlog */
export interface Agent5Input {
  epics: Epic[];
  estimations: Record<string, StoryEstimation>;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  sourceWishIds: string[];
  approvedAt: number;
}

/** Input que el Agente 5 entrega al Agente 6 al consolidar el plan de sprints */
export interface Agent6Input {
  epics: Epic[];
  estimations: Record<string, StoryEstimation>;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  plan: SprintPlan;
  sourceWishIds: string[];
  approvedAt: number;
}

/** Puente entre agentes (resultados aprobados que consume el siguiente paso) */
export interface WorkspacePipeline {
  /** Escrito al aprobar el Agente 1, consumido por el Agente 2 */
  agent2Input: Agent2Input | null;
  /** Escrito al aprobar el Agente 2, consumido por el Agente 3 */
  agent3Input: Agent3Input | null;
  /** Escrito al aprobar el Agente 3, consumido por el Agente 4 */
  agent4Input: Agent4Input | null;
  /** Escrito al aprobar el Agente 4, consumido por el Agente 5 */
  agent5Input: Agent5Input | null;
  /** Escrito al aprobar el Agente 5, consumido por un futuro Agente 6 */
  agent6Input: Agent6Input | null;
}

/** Estado completo del workspace de un usuario (un único flujo activo) */
export interface UserWorkspace {
  agent1: Agent1State;
  agent2: Agent2State;
  agent3: Agent3State;
  agent4: Agent4State;
  agent5: Agent5State;
  pipeline: WorkspacePipeline;
}

/** Preferencias de usuario que antes vivían en localStorage */
export interface WorkspacePreferences {
  /** Último agente visitado, usado para redirigir tras el login */
  lastAgent: string;
}

/** Snapshot del plan expuesto al cliente */
export interface WorkspacePlanSnapshot {
  id: import('@/lib/plans/types').PlanId;
  limits: import('@/lib/plans/types').PlanLimits;
  usage: import('@/lib/plans/types').UserUsage;
  subscription?: import('@/lib/plans/types').UserSubscription;
}

/** Respuesta del endpoint GET /api/workspace */
export interface WorkspaceResponse {
  workspace: UserWorkspace;
  preferences: WorkspacePreferences;
  activeProjectId: string | null;
  plan: WorkspacePlanSnapshot;
}

const EMPTY_AGENT3: Agent3State = {
  input: null,
  estimations: {},
  status: 'idle',
  error: null,
};

const EMPTY_AGENT4: Agent4State = {
  input: null,
  priorities: {},
  framework: 'moscow',
  status: 'idle',
  error: null,
};

const EMPTY_AGENT5: Agent5State = {
  input: null,
  plan: null,
  status: 'idle',
  error: null,
};

/** Estado vacío del workspace (tras nueva sesión). */
export function createEmptyWorkspace(): UserWorkspace {
  return {
    agent1: {
      file: null,
      transcription: null,
      discovery: null,
      enrichedContext: null,
      wishes: [],
      status: 'idle',
      error: null,
    },
    agent2: {
      input: null,
      epics: [],
      status: 'idle',
      error: null,
    },
    agent3: { ...EMPTY_AGENT3 },
    agent4: { ...EMPTY_AGENT4 },
    agent5: { ...EMPTY_AGENT5 },
    pipeline: {
      agent2Input: null,
      agent3Input: null,
      agent4Input: null,
      agent5Input: null,
      agent6Input: null,
    },
  };
}
