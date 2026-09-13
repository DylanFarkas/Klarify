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

/** Tipo de ítem de backlog (HU, bug o task técnica) */
export type WorkItemType = 'story' | 'bug' | 'task';

/** Severidad de un bug */
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';

/** Subtarea de implementación embebida en una historia (no es un work item TASK-XXX). */
export interface StorySubtask {
  id: string;       // ST-001, ST-002… scoped a la historia padre
  title: string;    // verbo de acción, concreto y verificable
  done: boolean;    // tracking de implementación
}

/** Ítem de backlog (historia, bug o task). El nombre UserStory se mantiene por compatibilidad. */
export interface UserStory {
  id: string;              // HU-001 | BUG-001 | TASK-001
  /** Discriminador semántico. Ausente en datos legacy → tratar como 'story'. */
  type?: WorkItemType;
  title: string;           // CA1: Título
  description: string;     // Story: "Como... quiero..."; bug/task: texto libre
  acceptanceCriteria: string[];  // Obligatorio para story; opcional para bug/task
  /** Desglose de implementación. Ausente en datos legacy → tratar como []. */
  subtasks?: StorySubtask[];
  /** Solo bugs */
  severity?: BugSeverity;
  /** Solo bugs: pasos para reproducir */
  stepsToReproduce?: string[];
  /** Solo tasks: notas técnicas opcionales */
  technicalNotes?: string;
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
  truncated?: boolean;
  truncationMessage?: string;
}

/** Respuesta de error */
export interface Agent2ErrorResponse {
  error: string;
  code: 'NO_INPUT' | 'EMPTY_WISHES' | 'PROCESSING_ERROR';
}
