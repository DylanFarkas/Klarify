/**
 * @fileoverview Constantes del Agente 1 — Ingesta de Contexto y Extracción.
 *
 * Centraliza límites, formatos aceptados, configuración de simulación
 * y la definición del pipeline de agentes.
 */

// ---------------------------------------------------------------------------
// Validación de archivos (CA1: .mp3, .wav, .txt, .pdf — max 50 MB)
// ---------------------------------------------------------------------------

/** Extensiones de archivo permitidas para carga */
export const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.txt', '.pdf'] as const;

/** Mapa de extensión → MIME type para validación */
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  '.mp3': ['audio/mpeg', 'audio/mp3'],
  '.wav': ['audio/wav', 'audio/x-wav'],
  '.txt': ['text/plain'],
  '.pdf': ['application/pdf'],
};

/** Tamaño máximo de archivo en bytes (50 MB según CA1) */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Etiqueta legible del tamaño máximo */
export const MAX_FILE_SIZE_LABEL = '50 MB';

/** String accept para el input de archivos HTML */
export const FILE_INPUT_ACCEPT = '.mp3,.wav,.txt,.pdf';

// ---------------------------------------------------------------------------
// Formato de IDs de deseos
// ---------------------------------------------------------------------------

/** Prefijo para los identificadores de deseos del cliente */
export const WISH_ID_PREFIX = 'DESEO';

// ---------------------------------------------------------------------------
// Pipeline de agentes (compartido — visible en el stepper lateral)
// ---------------------------------------------------------------------------

export interface AgentStep {
  /** Número del agente (1-6) */
  number: number;
  /** Nombre corto del agente */
  name: string;
  /** Ruta del agente en la app */
  path: string;
  /** Descripción breve para tooltips */
  description: string;
}

/** Definición de los 6 agentes del pipeline de Klarify */
export const AGENT_STEPS: AgentStep[] = [
  { number: 1, name: 'Ingesta de Contexto', path: '/agentes/1', description: 'Carga y transcripción de reuniones' },
  { number: 2, name: 'Backlog Inicial', path: '/agentes/2', description: 'Clasificación y análisis de deseos' },
  { number: 3, name: 'Estimación', path: '/agentes/3', description: 'Estimación de valor y esfuerzo' },
  { number: 4, name: 'Refinamiento', path: '/agentes/4', description: 'Criterios de aceptación y detalles' },
  { number: 5, name: 'Backlog Final', path: '/agentes/5', description: 'Backlog ejecutable y exportable' },
];

// ---------------------------------------------------------------------------
// Simulación (se reemplazará por llamadas a API reales)
// ---------------------------------------------------------------------------

/** Delay de simulación para transcripción (ms) */
export const TRANSCRIPTION_DELAY_MS = 3500;

/** Delay de simulación para extracción de deseos (ms) */
export const EXTRACTION_DELAY_MS = 2000;

/** Delay de simulación para evaluación de contexto (ms) */
export const ASSESSMENT_DELAY_MS = 1500;

// ---------------------------------------------------------------------------
// Discovery — preguntas de clarificación
// ---------------------------------------------------------------------------

/** Máximo de preguntas de clarificación por ronda (MVP) */
export const MAX_CLARIFY_QUESTIONS = 5;

/** Mínimo de opciones por pregunta (sin contar "Otra opción") */
export const MIN_OPTIONS_PER_QUESTION = 3;

/** Máximo de opciones por pregunta (sin contar "Otra opción") */
export const MAX_OPTIONS_PER_QUESTION = 4;

/** ID reservado para la opción "Otra opción" en la UI */
export const OTHER_OPTION_ID = 'other';

/** Etiqueta de la opción libre en la UI */
export const OTHER_OPTION_LABEL = 'Otra opción';

/** Umbral de caracteres para considerar contexto vago en mock (desarrollo) */
export const VAGUE_CONTEXT_CHAR_THRESHOLD = 80;

/** Dimensiones evaluadas para determinar si el contexto es suficiente */
export const CONTEXT_EVALUATION_DIMENSIONS = [
  'platform',
  'users',
  'scope',
  'business',
  'constraints',
] as const;

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

/** Clave de localStorage para persistir el estado del Agente 1 */
export const STORAGE_KEY_AGENT_1 = 'klarify-agent1-state';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/**
 * Formatea bytes a una cadena legible (ej: "2.5 MB", "340 KB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formatea segundos a timestamp legible (ej: "01:25").
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
