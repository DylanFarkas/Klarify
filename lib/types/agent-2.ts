/**
 * @fileoverview Tipos TypeScript para el Agente 2 — Backlog Inicial.
 */
import type { Wish, TranscriptionResult } from '@/lib/types/agent-1';

/** Etapas del flujo del Agente 2 */
export type Agent2Status =
  | 'idle'           // Sin input o esperando acción del usuario
  | 'generating'     // LLM generando épicas + HUs
  | 'review'         // Usuario revisando backlog generado (HITL)
  | 'approved';      // Backlog consolidado, listo para Agente 3

export interface Agent2Input {
  /** Contexto completo de la reunión (opcional para enriquecer HUs) */
  transcription: TranscriptionResult | null;
  /** Deseos aprobados por el humano en Agente 1 */
  wishes: Wish[];
}

/** Historia de Usuario estructurada (CA1) */
export interface UserStory {
  id: string;              // HU-001, HU-002...
  title: string;           // CA1: Título
  description: string;     // CA1: Descripción (formato "Como... quiero... para...")
  acceptanceCriteria: string[];  // CA1: Criterios de aceptación
  /** IDs de deseos que originaron esta HU (trazabilidad) */
  sourceWishIds: string[];
  source: 'auto' | 'manual';
  isEdited: boolean;
  createdAt: number;
}

/** Épica que agrupa HUs relacionadas */
export interface Epic {
  id: string;              // EPIC-001, EPIC-002...
  title: string;
  description: string;
  userStories: UserStory[];
  source: 'auto' | 'manual';
  isEdited: boolean;
  createdAt: number;
}

/** Estado global del Agente 2 */
export interface Agent2State {
  /** Input recibido del Agente 1 */
  input: Agent2Input | null;
  /** Backlog generado */
  epics: Epic[];
  status: Agent2Status;
  error: string | null;
}

/** Respuesta del endpoint POST /api/agentes/2/generate */
export interface Agent2GenerateResponse {
  epics: Epic[];
}

/** Respuesta de error */
export interface Agent2ErrorResponse {
  error: string;
  code: 'NO_INPUT' | 'EMPTY_WISHES' | 'PROCESSING_ERROR';
}
