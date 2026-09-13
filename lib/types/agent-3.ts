/**
 * @fileoverview Tipos TypeScript para el Agente 3 — Estimación.
 */

import type { Agent3Input } from '@/lib/types/workspace';

/** Etapas del flujo del Agente 3 */
export type Agent3Status =
  | 'idle'
  | 'estimating'
  | 'review'
  | 'approved';

/** Escala de esfuerzo del proyecto. Queda fija una vez hay estimaciones. */
export type EstimationMode = 'story_points' | 'time';

/** Estimación de una historia de usuario (IA o HITL) */
export interface StoryEstimation {
  /** Story Points Fibonacci. 0 en modo tiempo. */
  points: number;
  /** Minutos canónicos en modo tiempo (1d = 1440). Ausente/0 = sin estimar. */
  durationMinutes?: number;
  /** Etiqueta original en modo tiempo, p. ej. "2.5h". */
  durationLabel?: string;
  justification: string;
  isModified: boolean;
}

/** Estado global del Agente 3 */
export interface Agent3State {
  input: Agent3Input | null;
  estimations: Record<string, StoryEstimation>;
  /** null = aún no elegido. Legacy sin campo se trata como story_points. */
  estimationMode?: EstimationMode | null;
  status: Agent3Status;
  error: string | null;
}

/** Item de sugerencia devuelto por el LLM del Agente 3 */
export interface Agent3SuggestionItem {
  storyId: string;
  suggestedPoints?: number;
  suggestedDuration?: string;
  durationMinutes?: number;
  justification: string;
}

/** Respuesta del endpoint POST /api/agentes/3/estimate */
export interface Agent3EstimationResponse {
  suggestions: Agent3SuggestionItem[];
}

/** Épica simplificada para el adaptador de estimación */
export interface LocalEpic {
  id: string;
  title: string;
  description?: string;
  userStories?: LocalUserStory[];
}

/** Historia simplificada para el adaptador de estimación */
export interface LocalUserStory {
  id: string;
  title: string;
  description: string;
}
