/**
 * @fileoverview Schemas de bodies HTTP de rutas `/api/agentes/*`.
 *
 * Validan la forma del JSON. Las reglas de negocio (estimaciones faltantes,
 * códigos EMPTY_WISHES, etc.) siguen en `validateAgentNInput`.
 */

import * as z from 'zod';
import {
  estimationModeSchema,
  looseObjectSchema,
  prioritizationFrameworkSchema,
} from '@/lib/schemas/enums';

const transcriptionSchema = z.looseObject({
  fullText: z.string().trim().min(1, 'Se requiere una transcripción con texto.'),
});

export const agent1AnalyzeBodySchema = z.object({
  transcription: transcriptionSchema,
});

export const agent1ExtractBodySchema = z.object({
  transcription: transcriptionSchema,
  discovery: looseObjectSchema,
  answers: z.array(looseObjectSchema).optional(),
  skipped: z.boolean().optional(),
});

export const agent2GenerateBodySchema = z.looseObject({
  wishes: z.array(z.unknown()).min(1, 'El listado de deseos está vacío.'),
  transcription: z.unknown().nullable().optional(),
  isRegeneration: z.boolean().optional(),
});

export const agent3EstimateBodySchema = z.looseObject({
  epics: z.array(z.unknown()).min(1, 'El listado de épicas entrante está vacío.'),
  estimationMode: estimationModeSchema,
  isRegeneration: z.boolean().optional(),
});

export const agent4PrioritizeBodySchema = z.looseObject({
  epics: z.array(z.unknown()).min(1, 'El listado de épicas entrante está vacío.'),
  estimations: looseObjectSchema,
  estimationMode: estimationModeSchema.optional(),
  framework: prioritizationFrameworkSchema.optional(),
  isRegeneration: z.boolean().optional(),
});

export const agent5PlanBodySchema = z.looseObject({
  epics: z.array(z.unknown()).min(1, 'El listado de épicas entrante está vacío.'),
  estimations: looseObjectSchema,
  priorities: looseObjectSchema,
  framework: prioritizationFrameworkSchema,
  config: z.looseObject({
    sprintCapacitySp: z.number(),
    sprintDurationWeeks: z.number(),
    projectStartDate: z.string(),
  }),
  isRegeneration: z.boolean().optional(),
});

export const stackRecommendBodySchema = z.looseObject({
  isRegeneration: z.boolean().optional(),
});
