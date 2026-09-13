/**
 * @fileoverview Schemas de bodies HTTP restantes (projects, AI, GitHub, Klark).
 */

import * as z from 'zod';
import { aiProviderIdSchema, looseObjectSchema } from '@/lib/schemas/enums';

export const projectsCreateBodySchema = z.object({
  name: z.string().trim().min(1, 'El nombre del proyecto es obligatorio'),
});

export const projectsPatchBodySchema = z.union([
  z.object({
    action: z.literal('activate'),
    projectIds: z.array(z.string().trim().min(1)).min(1, 'projectIds es requerido'),
  }),
  z.object({
    projectId: z.string().trim().min(1, 'projectId es requerido'),
  }),
]);

export const aiProviderConnectBodySchema = z.object({
  provider: aiProviderIdSchema,
  apiKey: z.string().min(1, 'apiKey es requerida'),
  model: z.string().optional(),
});

export const aiProviderUpdateBodySchema = z.object({
  model: z.string().optional(),
  active: z.boolean().optional(),
  provider: aiProviderIdSchema.optional(),
});

export const githubConnectBodySchema = z.object({
  accessToken: z.string().min(1, 'accessToken is required'),
});

const githubRepoTargetSchema = z.object({
  mode: z.enum(['existing', 'create']),
  fullName: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  private: z.boolean().optional(),
});

const githubDestinationSchema = z.object({
  mode: z.enum(['create', 'existing']),
  projectTitle: z.string().optional(),
  githubProjectId: z.string().optional(),
});

export const githubExportBodySchema = z
  .object({
    projectId: z.string().trim().min(1, 'Datos de exportación incompletos.'),
    repoFullName: z.string().optional(),
    repo: githubRepoTargetSchema.optional(),
    destination: githubDestinationSchema,
    options: z
      .object({
        createEpicIssues: z.boolean().optional(),
        createMilestones: z.boolean().optional(),
      })
      .optional(),
  })
  .refine((body) => Boolean(body.repo?.mode || body.repoFullName?.trim()), {
    message: 'Datos de exportación incompletos.',
    path: ['repo'],
  });

export const harnessChatBodySchema = z
  .object({
    message: z.string().optional(),
    confirmedAction: z
      .object({
        name: z.string().min(1),
        args: looseObjectSchema,
      })
      .optional(),
    projectId: z.string().optional(),
  })
  .refine(
    (body) => Boolean(body.message?.trim() || body.confirmedAction),
    'Mensaje vacío'
  );
