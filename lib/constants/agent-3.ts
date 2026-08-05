/**
 * @fileoverview Constantes del Agente 3 — Estimación en Story Points.
 */

/** Escala Fibonacci permitida para Story Points */
export const FIBONACCI_SCALE = [1, 2, 3, 5, 8, 13, 21] as const;

/** Etiqueta legible de la escala Fibonacci (prompts LLM, validación) */
export const FIBONACCI_SCALE_LABEL = FIBONACCI_SCALE.join(', ');

/** Longitud máxima de la justificación técnica por historia */
export const MAX_JUSTIFICATION_LENGTH = 140;

/** Prefijo de las justificaciones generadas por el mock */
export const MOCK_ESTIMATION_PREFIX = 'Agente 3 (Mock Scrum Master):';

/** Prefijo de las justificaciones generadas por el Agente 3 */
export const AGENT3_JUSTIFICATION_PREFIX = 'Agente 3 (Scrum Master):';

// ---------------------------------------------------------------------------
// localStorage keys (legacy — el estado vive en Firestore vía workspace)
// ---------------------------------------------------------------------------

export const STORAGE_KEY_AGENT_3_INPUT = 'agent_3_input';
export const STORAGE_KEY_AGENT_3 = 'klarify-agent3-state';

// ---------------------------------------------------------------------------
// Simulación (mock adapter)
// ---------------------------------------------------------------------------

/** Delay total de simulación para estimación mock (ms) */
export const ESTIMATION_DELAY_MS = 2500;