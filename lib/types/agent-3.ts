/**
 * @fileoverview Tipos TypeScript para el Agente 3 — Estimación en Story Points.
 */

import type { Agent3Input } from '@/lib/types/workspace';

/** Etapas del flujo del Agente 3 */
export type Agent3Status =
  | 'idle'
  | 'estimating'
  | 'review'
  | 'approved';

/** Estimación de una historia de usuario (IA o HITL) */
export interface StoryEstimation {
  points: number;
  justification: string;
  isModified: boolean;
}

/** Estado global del Agente 3 */
export interface Agent3State {
  input: Agent3Input | null;
  estimations: Record<string, StoryEstimation>;
  status: Agent3Status;
  error: string | null;
}

/** Item de sugerencia devuelto por el LLM del Agente 3 */
export interface Agent3SuggestionItem {
  storyId: string;
  suggestedPoints: number;
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
