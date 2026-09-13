/**
 * @fileoverview Schemas de argumentos de tools de Klark.
 *
 * Una sola fuente de verdad: `HARNESS_TOOL_SCHEMAS` + `z.toJSONSchema`
 * generan `HARNESS_TOOL_DECLARATIONS`.
 */

import * as z from 'zod';
import type { LlmToolDefinition, LlmToolParameterSchema } from '@/lib/llm/types';
import {
  bugSeveritySchema,
  workItemTypeSchema,
} from '@/lib/schemas/work-item';
import { kanbanStatusSchema } from '@/lib/schemas/enums';
import { firstZodErrorMessage } from '@/lib/schemas/parse';

const emptyArgsSchema = z.object({});

export const listBacklogArgsSchema = emptyArgsSchema;
export const getStackArgsSchema = emptyArgsSchema;

export const getStoryArgsSchema = z.object({
  storyId: z
    .string()
    .trim()
    .min(1, 'Falta storyId.')
    .describe('ID del ítem. Preferir HU-XXX / BUG-XXX / TASK-XXX.'),
});

export const createStoryArgsSchema = z.object({
  epicId: z.string().trim().min(1, 'Faltan epicId, title o description.').describe(
    'ID de la épica (p. ej. EPIC-001)'
  ),
  type: workItemTypeSchema
    .optional()
    .describe('story (HU), bug o task. Default: story.'),
  title: z.string().trim().min(1, 'Faltan epicId, title o description.'),
  description: z
    .string()
    .trim()
    .min(1, 'Faltan epicId, title o description.')
    .describe('Story: Como… quiero… para…. Bug/task: texto libre del fallo o trabajo técnico.'),
  acceptanceCriteria: z
    .array(z.string())
    .optional()
    .describe('Obligatorio para story (≥1). Opcional para bug/task.'),
  subtasks: z
    .array(z.string())
    .optional()
    .describe('Títulos de subtareas de implementación (opcional). No son TASK-XXX de backlog.'),
  severity: bugSeveritySchema
    .optional()
    .describe('Solo bug: low|medium|high|critical. Default medium.'),
  stepsToReproduce: z
    .array(z.string())
    .optional()
    .describe('Solo bug: pasos para reproducir (≥1 obligatorio).'),
  technicalNotes: z.string().optional().describe('Solo task: notas técnicas opcionales.'),
  points: z
    .number()
    .optional()
    .describe(
      'Solo si el proyecto estima en Story Points (Fibonacci 1,2,3,5,8,13,21). Default 3 (story/task) o 1 (bug). No usar en modo tiempo.'
    ),
  duration: z
    .string()
    .optional()
    .describe(
      'Solo si el proyecto estima en tiempo. Unidad única: 2d, 3h, 50m, 2.5h. 1d = 24h calendario. Default 1h (story/task) o 30m (bug).'
    ),
  category: z
    .string()
    .optional()
    .describe(
      'Código canónico de prioridad del framework activo: moscow→must|should|could|wont; wsjf→critical|high|medium|low; rice→quick-win|major-project|fill-in|thankless; value-effort→high-value-low-effort|...'
    ),
  sprintId: z
    .union([z.string(), z.null()])
    .optional()
    .describe('ID de sprint opcional; omite para dejar sin asignar. No uses un sprint [completed].'),
});

export const updateStoryArgsSchema = z.object({
  storyId: z.string().trim().min(1, 'Falta storyId.'),
  title: z.string().optional(),
  description: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  subtasks: z
    .array(z.string())
    .optional()
    .describe('Reemplazo completo de subtareas (array de títulos).'),
  severity: bugSeveritySchema.optional(),
  stepsToReproduce: z.array(z.string()).optional(),
  technicalNotes: z.string().optional(),
  epicId: z.string().optional().describe('Mover a otra épica'),
  points: z
    .number()
    .optional()
    .describe('Solo en modo Story Points (Fibonacci). No usar en modo tiempo.'),
  duration: z
    .string()
    .optional()
    .describe('Solo en modo tiempo: 2d, 3h, 50m, 2.5h. 1d = 24h calendario.'),
  category: z
    .string()
    .optional()
    .describe('Código canónico de prioridad (p. ej. must, should, could, wont). No uses "Should-have".'),
  sprintId: z
    .union([z.string(), z.null()])
    .optional()
    .describe(
      'Nuevo sprint; null o cadena vacía para desasignar. No uses un sprint [completed] ni saques HU de uno cerrado.'
    ),
});

export const createSubtaskArgsSchema = z.object({
  storyId: z
    .string()
    .trim()
    .min(1, 'Faltan storyId o title.')
    .describe('ID de la historia padre (HU-XXX / BUG-XXX / TASK-XXX).'),
  title: z
    .string()
    .trim()
    .min(1, 'Faltan storyId o title.')
    .describe('Título concreto y accionable. Preferir verbo de acción.'),
});

export const updateSubtaskArgsSchema = z.object({
  storyId: z.string().trim().min(1, 'Faltan storyId o subtaskId.'),
  subtaskId: z.string().trim().min(1, 'Faltan storyId o subtaskId.').describe('ID de la subtarea (ST-001).'),
  title: z.string().optional(),
  done: z.boolean().optional().describe('Marcar como hecha o pendiente.'),
});

export const deleteSubtaskArgsSchema = z.object({
  storyId: z.string().trim().min(1, 'Faltan storyId o subtaskId.'),
  subtaskId: z.string().trim().min(1, 'Faltan storyId o subtaskId.').describe('ID de la subtarea (ST-001).'),
});

export const deleteStoryArgsSchema = z.object({
  storyId: z
    .string()
    .trim()
    .min(1, 'Falta storyId.')
    .describe('ID del ítem. Preferir HU-XXX, BUG-XXX o TASK-XXX. También acepta "28", "HU-28" o alias.'),
  confirm: z.boolean().optional().describe('Debe ser true solo tras confirmación del usuario'),
});

export const createEpicArgsSchema = z.object({
  title: z.string().trim().min(1, 'Faltan title o description.'),
  description: z.string().trim().min(1, 'Faltan title o description.'),
});

export const updateEpicArgsSchema = z.object({
  epicId: z.string().trim().min(1, 'Falta epicId.'),
  title: z.string().optional(),
  description: z.string().optional(),
});

export const deleteEpicArgsSchema = z.object({
  epicId: z.string().trim().min(1, 'Falta epicId.'),
  confirm: z.boolean().optional().describe('Debe ser true solo tras confirmación del usuario'),
});

export const assignStorySprintArgsSchema = z.object({
  storyId: z.string().trim().min(1, 'Falta storyId.'),
  sprintId: z
    .union([z.string(), z.null()])
    .optional()
    .describe('ID del sprint; null o vacío para desasignar. Falla si el sprint origen o destino está cerrado.'),
});

export const createSprintArgsSchema = z.object({
  goal: z
    .string()
    .optional()
    .describe('Objetivo del sprint. Ej: "Login y agenda" o "Sprint 3: Pagos".'),
});

export const updateSprintArgsSchema = z.object({
  sprintId: z.string().trim().min(1, 'Falta sprintId.'),
  goal: z.string().optional(),
  startDate: z.string().optional().describe('YYYY-MM-DD'),
  endDate: z.string().optional().describe('YYYY-MM-DD'),
});

export const startSprintArgsSchema = z.object({
  sprintId: z.string().trim().min(1, 'Falta sprintId.'),
});

export const completeSprintArgsSchema = z.object({
  sprintId: z.string().trim().min(1, 'Falta sprintId.'),
  rollover: z
    .enum(['backlog', 'next_planned'])
    .optional()
    .describe('Destino de historias incompletas. Default: backlog.'),
});

export const updateStoryStatusArgsSchema = z.object({
  storyId: z.string().trim().min(1, 'Faltan storyId o status.'),
  status: kanbanStatusSchema,
});

export const assignStoryArgsSchema = z.object({
  storyId: z.string().trim().min(1, 'Falta storyId.'),
  memberId: z
    .union([z.string(), z.null()])
    .optional()
    .describe('ID del miembro, nombre, o null/vacío para desasignar'),
});

export const deleteSprintArgsSchema = z.object({
  sprintId: z
    .string()
    .trim()
    .min(1, 'Falta sprintId.')
    .describe('ID del sprint (SPRINT-001) o número ("1", "sprint 2").'),
  confirm: z.boolean().optional().describe('Debe ser true solo tras confirmación del usuario'),
});

export const saveStackArgsSchema = z.object({
  productKind: z.string().trim().min(1, 'Faltan productKind, architecturePattern o layers.'),
  architecturePattern: z
    .string()
    .trim()
    .min(1, 'Faltan productKind, architecturePattern o layers.'),
  layers: z
    .record(z.string(), z.unknown())
    .describe(
      'Mapa capa → array de { catalogId?, customName?, isPrimary? }. Capas: frontend, backend, database, auth, hosting, styling, orm, etc.'
    ),
  rationale: z.string().optional(),
  status: z
    .literal('saved')
    .optional()
    .describe('El stack se persiste de inmediato en el proyecto.'),
});

export const HARNESS_TOOL_SCHEMAS = {
  list_backlog: listBacklogArgsSchema,
  get_story: getStoryArgsSchema,
  create_story: createStoryArgsSchema,
  update_story: updateStoryArgsSchema,
  create_subtask: createSubtaskArgsSchema,
  update_subtask: updateSubtaskArgsSchema,
  delete_subtask: deleteSubtaskArgsSchema,
  delete_story: deleteStoryArgsSchema,
  create_epic: createEpicArgsSchema,
  update_epic: updateEpicArgsSchema,
  delete_epic: deleteEpicArgsSchema,
  assign_story_sprint: assignStorySprintArgsSchema,
  create_sprint: createSprintArgsSchema,
  update_sprint: updateSprintArgsSchema,
  start_sprint: startSprintArgsSchema,
  complete_sprint: completeSprintArgsSchema,
  update_story_status: updateStoryStatusArgsSchema,
  assign_story: assignStoryArgsSchema,
  delete_sprint: deleteSprintArgsSchema,
  get_stack: getStackArgsSchema,
  save_stack: saveStackArgsSchema,
} as const;

export type HarnessToolName = keyof typeof HARNESS_TOOL_SCHEMAS;

const TOOL_DESCRIPTIONS: Record<HarnessToolName, string> = {
  list_backlog:
    'Lista el backlog actual: épicas, historias, esfuerzo (Story Points o tiempo), prioridad y asignación a sprints.',
  get_story:
    'Obtiene un ítem por ID (HU-XXX, BUG-XXX, TASK-XXX, "28", etc.). Úsala para verificar existencia o leer detalle antes de mutar.',
  create_story:
    'Crea un ítem de backlog (historia, bug o task) en una épica existente. Usa type=story|bug|task (default story).',
  update_story:
    'Actualiza un ítem (HU/bug/task): título, descripción, CA, severity/steps/notes, épica, estimación (points o duration según el modo del proyecto), prioridad o sprint. No cambia el type. Falla con SPRINT_CLOSED si la HU está en un sprint cerrado.',
  create_subtask:
    'Añade una subtarea de implementación a una historia (HU/bug/task). Empieza con un verbo. No crea un TASK-XXX de backlog.',
  update_subtask:
    'Actualiza el título o el estado done de una subtarea (ST-XXX) de una historia.',
  delete_subtask: 'Elimina una subtarea de una historia. No requiere confirmación.',
  delete_story:
    'Elimina un ítem (HU/bug/task). Requiere confirm=true tras confirmación explícita del usuario. Falla con SPRINT_CLOSED si la HU está en un sprint cerrado.',
  create_epic: 'Crea una épica vacía en el backlog.',
  update_epic: 'Actualiza título o descripción de una épica.',
  delete_epic:
    'Elimina una épica y todas sus historias. Requiere confirm=true tras confirmación del usuario.',
  assign_story_sprint:
    'Asigna una historia a un sprint o la deja sin asignar. Falla con SPRINT_CLOSED si el origen o el destino está cerrado.',
  create_sprint:
    'Crea un sprint vacío al final del plan. goal es el objetivo (se prefija Sprint N: si no viene así).',
  update_sprint:
    'Actualiza el goal y/o fechas de un sprint existente (SPRINT-XXX o número).',
  start_sprint:
    'Inicia un sprint planificado (planned → active). Solo puede haber un sprint activo a la vez.',
  complete_sprint:
    'Cierra el sprint activo. Las HU no hechas salen al backlog o al siguiente sprint planned (rollover).',
  update_story_status:
    'Cambia el estado Kanban de una historia (todo, in_progress, code_review, done). Requiere tablero de ejecución. Falla con SPRINT_CLOSED si la HU está en un sprint cerrado.',
  assign_story:
    'Asigna o desasigna un responsable del equipo a una historia (tablero). Usa memberId o nombre. Falla con SPRINT_CLOSED si la HU está en un sprint cerrado.',
  delete_sprint:
    'Elimina un sprint vacío. Falla con SPRINT_NOT_EMPTY si tiene historias asignadas. Requiere confirm=true tras confirmación del usuario.',
  get_stack:
    'Lee el stack tecnológico actual del proyecto: producto, arquitectura, capas y tecnologías.',
  save_stack:
    'Guarda o actualiza el stack del proyecto. Usa catalogId del catálogo interno o customName. Marca isPrimary en frontend/backend/database. Incluye solo capas justificadas por el backlog (realtime, pagos, CMS, etc. solo si el producto lo requiere). No incluyas sources.',
};

function schemaToToolParameters(schema: z.ZodType): LlmToolParameterSchema {
  const json = z.toJSONSchema(schema) as {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  return {
    type: 'object',
    properties: json.properties ?? {},
    ...(json.required?.length ? { required: json.required } : {}),
    ...(json.additionalProperties !== undefined
      ? { additionalProperties: json.additionalProperties }
      : {}),
  };
}

export function buildHarnessToolDeclarations(): LlmToolDefinition[] {
  return (Object.keys(HARNESS_TOOL_SCHEMAS) as HarnessToolName[]).map((name) => ({
    name,
    description: TOOL_DESCRIPTIONS[name],
    parameters: schemaToToolParameters(HARNESS_TOOL_SCHEMAS[name]),
  }));
}

export function parseHarnessToolArgs(
  name: string,
  args: Record<string, unknown>
): { success: true; data: Record<string, unknown> } | { success: false; error: string } {
  if (!(name in HARNESS_TOOL_SCHEMAS)) {
    return { success: true, data: args };
  }
  const schema = HARNESS_TOOL_SCHEMAS[name as HarnessToolName];
  const result = schema.safeParse(args);
  if (!result.success) {
    return { success: false, error: firstZodErrorMessage(result.error) };
  }
  return { success: true, data: result.data as Record<string, unknown> };
}
