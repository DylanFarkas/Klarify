/**
 * @fileoverview Tipos del workspace persistido en Firestore.
 *
 * El workspace vive en `users/{uid}.workspace` y guarda el estado del
 * pipeline de agentes (1 y 2) además del puente entre ellos. Es el reemplazo
 * de las claves de localStorage que antes mantenían este estado en el navegador.
 */

import type { Agent1State } from '@/lib/types/agent-1';
import type { Agent2State, Agent2Input, Epic } from '@/lib/types/agent-2';

/** Input que el Agente 2 entrega al Agente 3 al aprobar el backlog */
export interface Agent3Input {
  epics: Epic[];
  sourceWishIds: string[];
  approvedAt: number;
}

/** Puente entre agentes (resultados aprobados que consume el siguiente paso) */
export interface WorkspacePipeline {
  /** Escrito al aprobar el Agente 1, consumido por el Agente 2 */
  agent2Input: Agent2Input | null;
  /** Escrito al aprobar el Agente 2, consumido por el futuro Agente 3 */
  agent3Input: Agent3Input | null;
}

/** Estado completo del workspace de un usuario (un único flujo activo) */
export interface UserWorkspace {
  agent1: Agent1State;
  agent2: Agent2State;
  pipeline: WorkspacePipeline;
}

/** Preferencias de usuario que antes vivían en localStorage */
export interface WorkspacePreferences {
  /** Último agente visitado, usado para redirigir tras el login */
  lastAgent: string;
}

/** Respuesta del endpoint GET /api/workspace */
export interface WorkspaceResponse {
  workspace: UserWorkspace;
  preferences: WorkspacePreferences;
}

/** Estado vacío del workspace (tras nueva sesión). */
export function createEmptyWorkspace(): UserWorkspace {
  return {
    agent1: {
      file: null,
      transcription: null,
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
    pipeline: {
      agent2Input: null,
      agent3Input: null,
    },
  };
}