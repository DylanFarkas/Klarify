/**
 * @fileoverview Schemas Zod de ítems de backlog (story | bug | task).
 *
 * Las reglas replican `validateWorkItemFields` / `validateSubtasks`.
 * Los tipos de dominio siguen en `lib/types/agent-2`.
 */

import * as z from 'zod';
import {
  MAX_SUBTASKS_PER_STORY,
  MIN_ACCEPTANCE_CRITERIA,
} from '@/lib/constants/agent-2';
import { firstZodErrorMessage } from '@/lib/schemas/parse';
import type { BugSeverity, StorySubtask, WorkItemType } from '@/lib/types/agent-2';

export interface WorkItemFieldInput {
  type?: WorkItemType;
  title?: string;
  description?: string;
  acceptanceCriteria?: string[];
  subtasks?: StorySubtask[] | string[];
  severity?: BugSeverity;
  stepsToReproduce?: string[];
  technicalNotes?: string;
}

export const workItemTypeSchema = z.enum(['story', 'bug', 'task'], {
  error: 'Tipo de ítem inválido.',
});

export const bugSeveritySchema = z.enum(['low', 'medium', 'high', 'critical'], {
  error: 'Severidad de bug inválida.',
});

const subtaskObjectSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Cada subtarea necesita un título.'),
  done: z.boolean().optional(),
});

export const subtaskInputSchema = z.union([
  z.string().trim().min(1, 'Cada subtarea necesita un título.'),
  subtaskObjectSchema,
]);

export const subtasksSchema = z
  .array(subtaskInputSchema, { error: 'Las subtareas deben ser una lista.' })
  .max(
    MAX_SUBTASKS_PER_STORY,
    `Máximo ${MAX_SUBTASKS_PER_STORY} subtareas por historia.`
  );

const workItemFieldsShape = {
  type: workItemTypeSchema.optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  subtasks: subtasksSchema.optional(),
  severity: bugSeveritySchema.optional(),
  stepsToReproduce: z.array(z.string()).optional(),
  technicalNotes: z.string().optional(),
};

function applyWorkItemRules(partial: boolean) {
  return (
    data: {
      type?: WorkItemType;
      title?: string;
      description?: string;
      acceptanceCriteria?: string[];
      stepsToReproduce?: string[];
    },
    ctx: z.RefinementCtx
  ) => {
    const type = data.type ?? 'story';

    if (!partial) {
      if (!data.title?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'El título es obligatorio.',
          path: ['title'],
        });
      }
      if (!data.description?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'La descripción es obligatoria.',
          path: ['description'],
        });
      }
    }

    if (type === 'story') {
      const criteria = data.acceptanceCriteria ?? [];
      const shouldCheck =
        !partial || data.acceptanceCriteria !== undefined;
      if (
        shouldCheck &&
        criteria.filter((c) => c.trim()).length < MIN_ACCEPTANCE_CRITERIA
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'Se requiere al menos un criterio de aceptación.',
          path: ['acceptanceCriteria'],
        });
      }
    }

    if (type === 'bug') {
      const steps = data.stepsToReproduce ?? [];
      const shouldCheckSteps =
        !partial || data.stepsToReproduce !== undefined;
      if (shouldCheckSteps && steps.filter((s) => s.trim()).length < 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'Se requiere al menos un paso para reproducir el bug.',
          path: ['stepsToReproduce'],
        });
      }
    }
  };
}

export const workItemFieldsSchema = z
  .object(workItemFieldsShape)
  .superRefine(applyWorkItemRules(false));

export const workItemFieldsPartialSchema = z
  .looseObject(workItemFieldsShape)
  .superRefine(applyWorkItemRules(true));

export function parseWorkItemFields(
  input: unknown,
  options: { partial?: boolean } = {}
): string | null {
  const schema = options.partial
    ? workItemFieldsPartialSchema
    : workItemFieldsSchema;
  const result = schema.safeParse(input);
  if (result.success) return null;
  return firstZodErrorMessage(result.error);
}

export function parseSubtasks(value: unknown): string | null {
  if (value === undefined) return null;
  const result = subtasksSchema.safeParse(value);
  if (result.success) return null;
  return firstZodErrorMessage(result.error);
}
