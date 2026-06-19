/**
 * @fileoverview Tipos TypeScript para el Agente 1 — Ingesta de Contexto y Extracción.
 *
 * Define las estructuras de datos compartidas entre componentes, servicios
 * y API routes del Agente 1. Cualquier cambio aquí impacta todo el pipeline.
 */

// ---------------------------------------------------------------------------
// Estado del pipeline
// ---------------------------------------------------------------------------

/** Etapas del flujo del Agente 1 */
export type Agent1Status =
  | 'idle'          // Esperando que el usuario cargue un archivo
  | 'uploading'     // Archivo siendo enviado al servidor
  | 'transcribing'  // Transcripción en progreso
  | 'editing_transcription' // Usuario editando el texto en vivo antes de extraer deseos
  | 'extracting'    // Extracción de deseos en progreso
  | 'review'        // Usuario revisando transcripción + deseos
  | 'approved';     // Deseos aprobados, listo para Agente 2

// ---------------------------------------------------------------------------
// Archivo subido
// ---------------------------------------------------------------------------

/** Metadatos del archivo subido por el usuario */
export interface UploadedFile {
  /** Identificador único generado en el cliente */
  id: string;
  /** Nombre original del archivo (ej: "reunion-sprint-14.mp3") */
  name: string;
  /** Tamaño en bytes */
  size: number;
  /** MIME type del archivo (ej: "audio/mpeg") */
  type: string;
  /** Timestamp de última modificación del archivo */
  lastModified: number;
}

// ---------------------------------------------------------------------------
// Transcripción
// ---------------------------------------------------------------------------

/** Segmento individual de la transcripción con timestamps */
export interface TranscriptionSegment {
  /** Texto transcrito del segmento */
  text: string;
  /** Tiempo de inicio en segundos */
  start: number;
  /** Tiempo de fin en segundos */
  end: number;
  /** Nivel de confianza de la transcripción (0-1) */
  confidence: number;
  /** Hablante identificado (ej: "Cliente", "Facilitador") */
  speaker?: string;
}

/** Resultado completo de la transcripción */
export interface TranscriptionResult {
  /** Texto completo de la transcripción */
  fullText: string;
  /** Segmentos individuales con timestamps y confianza */
  segments: TranscriptionSegment[];
  /** Duración total del audio en segundos (0 para documentos de texto) */
  duration: number;
  /** Idioma detectado */
  language: string;
}

// ---------------------------------------------------------------------------
// Deseos del cliente
// ---------------------------------------------------------------------------

/** Un deseo/necesidad individual extraído de la transcripción */
export interface Wish {
  /** Identificador con formato DESEO-001, DESEO-002, etc. */
  id: string;
  /** Texto descriptivo del deseo */
  text: string;
  /** Origen del deseo: 'auto' (IA) o 'manual' (usuario) */
  source: 'auto' | 'manual';
  /** Indica si el texto fue editado manualmente después de la extracción */
  isEdited: boolean;
  /** Timestamp de creación */
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Estado completo del Agente 1
// ---------------------------------------------------------------------------

/** Estado global del Agente 1 — gestionado en la página principal */
export interface Agent1State {
  /** Archivo cargado por el usuario */
  file: UploadedFile | null;
  /** Resultado de la transcripción */
  transcription: TranscriptionResult | null;
  /** Lista de deseos del cliente (editables por HITL) */
  wishes: Wish[];
  /** Etapa actual del flujo */
  status: Agent1Status;
  /** Mensaje de error si algo falla */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Respuesta de la API
// ---------------------------------------------------------------------------

/** Respuesta del endpoint POST /api/agentes/1/upload */
export interface Agent1UploadResponse {
  transcription: TranscriptionResult;
  wishes: Wish[];
}

/** Respuesta de error de la API */
export interface Agent1ErrorResponse {
  error: string;
  code: 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'PROCESSING_ERROR';
}
