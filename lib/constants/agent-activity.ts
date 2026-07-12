/**
 * @fileoverview IDs y labels reutilizables para eventos de actividad del agente.
 */

export const AGENT_ACTIVITY = {
  // Agente 1 — analyze
  PHASE_ASSESS: { id: 'assess', label: 'Evaluando contexto' },
  PHASE_EXTRACT: { id: 'extract', label: 'Extrayendo deseos' },
  ACTION_READ_TRANSCRIPTION: { id: 'read-transcription', label: 'Leyendo transcripción' },
  ACTION_ANALYZE_CONTEXT: { id: 'analyze-context', label: 'Analizando contexto del proyecto' },
  ACTION_BUILD_CONTEXT: { id: 'build-context', label: 'Construyendo contexto enriquecido' },
  ACTION_EXTRACT_WISHES: { id: 'extract-wishes', label: 'Extrayendo deseos' },

  // Agente 1 — extract
  ACTION_MERGE_CLARIFICATIONS: {
    id: 'merge-clarifications',
    label: 'Integrando respuestas de clarificación',
  },

  // Agente 2 — generate
  PHASE_GENERATE: { id: 'generate', label: 'Generando backlog' },
  ACTION_READ_WISHES: { id: 'read-wishes', label: 'Leyendo deseos aprobados' },
  ACTION_GROUP_EPICS: { id: 'group-epics', label: 'Agrupando en épicas temáticas' },
  ACTION_GENERATE_STORIES: { id: 'generate-stories', label: 'Generando historias de usuario' },

  // Agente 4 — prioritize
  PHASE_PRIORITIZE: { id: 'prioritize', label: 'Priorizando backlog' },
  ACTION_READ_BACKLOG: { id: 'read-backlog', label: 'Leyendo backlog estimado' },
  ACTION_PRIORITIZE_STORIES: {
    id: 'prioritize-stories',
    label: 'Clasificando historias',
  },

  // Agente 5 — plan
  PHASE_PLAN_SPRINTS: { id: 'plan-sprints', label: 'Planificando sprints' },
  ACTION_READ_PRIORITIZED_BACKLOG: {
    id: 'read-prioritized-backlog',
    label: 'Leyendo backlog priorizado',
  },
  ACTION_ASSIGN_SPRINTS: {
    id: 'assign-sprints',
    label: 'Asignando historias a sprints',
  },
  ACTION_BUILD_SCHEDULE: {
    id: 'build-schedule',
    label: 'Generando cronograma',
  },
} as const;

/** Acciones que invocan al LLM y emiten bloques de razonamiento. */
export const LLM_STREAM_ACTION_IDS = new Set<string>([
  AGENT_ACTIVITY.ACTION_ANALYZE_CONTEXT.id,
  AGENT_ACTIVITY.ACTION_EXTRACT_WISHES.id,
  AGENT_ACTIVITY.ACTION_GENERATE_STORIES.id,
  AGENT_ACTIVITY.ACTION_PRIORITIZE_STORIES.id,
  AGENT_ACTIVITY.ACTION_ASSIGN_SPRINTS.id,
]);

/** Tiempo mínimo visible para acciones de preparación (evita que desaparezcan al instante). */
export const PREP_ACTION_MIN_VISIBLE_MS = 650;
