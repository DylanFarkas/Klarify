/**
 * @fileoverview Schemas Zod de la API de plataforma /api/v1.
 */

import * as z from 'zod';
import { workItemFieldsSchema, subtasksSchema, bugSeveritySchema } from '@/lib/schemas/work-item';
import {
  frameworkCategorySchema,
  kanbanStatusSchema,
} from '@/lib/schemas/enums';
import { sprintCompleteRolloverSchema } from '@/lib/schemas/enums';

export const tokenCreateBodySchema = z.object({
  name: z.string().trim().max(80).optional(),
});

export const deviceAuthorizeBodySchema = z.object({
  userCode: z.string().trim().min(1, 'Falta user_code.'),
});

export const devicePollQuerySchema = z.object({
  device_code: z.string().trim().min(1, 'Falta device_code.'),
});

export const projectCreateBodySchema = z.object({
  name: z.string().trim().min(1, 'El nombre del proyecto es obligatorio.'),
});

export const epicCreateBodySchema = z.object({
  title: z.string().trim().min(1, 'Falta title.'),
  description: z.string().trim().min(1, 'Falta description.'),
});

export const epicPatchBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
  })
  .refine((value) => value.title !== undefined || value.description !== undefined, {
    message: 'Indica title o description.',
  });

export const storyCreateBodySchema = z
  .object({
    epicId: z.string().trim().min(1, 'Falta epicId.'),
    sprintId: z.union([z.string(), z.null()]).optional(),
    points: z.number().optional(),
    duration: z.string().optional(),
    durationLabel: z.string().optional(),
    category: frameworkCategorySchema.optional(),
  })
  .and(workItemFieldsSchema);

export const storyPatchBodySchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  subtasks: subtasksSchema.optional(),
  severity: bugSeveritySchema.optional(),
  stepsToReproduce: z.array(z.string()).optional(),
  technicalNotes: z.string().optional(),
  epicId: z.string().optional(),
  sprintId: z.union([z.string(), z.null()]).optional(),
  points: z.number().optional(),
  duration: z.string().optional(),
  category: frameworkCategorySchema.optional(),
});

export const subtaskCreateBodySchema = z.object({
  title: z.string().trim().min(1, 'Falta title.'),
});

export const subtaskPatchBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    done: z.boolean().optional(),
  })
  .refine((value) => value.title !== undefined || value.done !== undefined, {
    message: 'Indica title o done.',
  });

export const storyStatusBodySchema = z.object({
  status: kanbanStatusSchema,
});

export const sprintCreateBodySchema = z.object({
  goal: z.string().trim().optional(),
});

export const sprintPatchBodySchema = z.object({
  goal: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const sprintCompleteBodySchema = z.object({
  rollover: sprintCompleteRolloverSchema.optional(),
});

export const stackPutBodySchema = z.object({
  productKind: z.string().trim().min(1, 'Falta productKind.'),
  architecturePattern: z.string().trim().min(1, 'Falta architecturePattern.'),
  layers: z.record(z.string(), z.unknown()),
  rationale: z.string().optional(),
});

const backlogImportStorySchema = z
  .object({
    points: z.number().optional(),
    duration: z.string().optional(),
    durationLabel: z.string().optional(),
    category: frameworkCategorySchema.optional(),
  })
  .and(workItemFieldsSchema);

export const backlogImportBodySchema = z.object({
  epics: z
    .array(
      z.object({
        title: z.string().trim().min(1, 'Falta title en una épica.'),
        description: z.string().trim().min(1, 'Falta description en una épica.'),
        stories: z
          .array(backlogImportStorySchema)
          .min(1, 'Cada épica necesita al menos una historia.'),
      })
    )
    .min(1, 'El import necesita al menos una épica.'),
});

export const confirmQuery = (url: URL): boolean => {
  const raw = url.searchParams.get('confirm');
  return raw === 'true' || raw === '1' || raw === 'yes';
};
