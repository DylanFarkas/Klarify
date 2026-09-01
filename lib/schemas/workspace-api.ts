/**
 * @fileoverview Schemas del envelope POST/PATCH /api/workspace.
 *
 * PATCH valida el envelope, no el estado interno de cada agente.
 * POST discrimina por `action` y valida el payload concreto.
 */

import * as z from 'zod';
import {
  workItemFieldsPartialSchema,
  workItemFieldsSchema,
} from '@/lib/schemas/work-item';
import {
  frameworkCategorySchema,
  kanbanStatusSchema,
  looseObjectSchema,
  projectMemberRoleSchema,
  sprintCompleteRolloverSchema,
  workspaceAgentIdSchema,
} from '@/lib/schemas/enums';

const projectIdField = {
  projectId: z.string().trim().min(1).optional(),
};

export const workspacePatchSchema = z.union([
  z.object({
    preferences: z.object({
      lastAgent: z.string(),
    }),
  }),
  z.object({
    agent: workspaceAgentIdSchema,
    data: looseObjectSchema,
  }),
]);

const createUserStoryPayloadSchema = z
  .object({
    epicId: z.string().trim().min(1, 'Payload invalido'),
    sprintId: z.string().nullable().optional(),
    points: z.number().optional(),
    durationLabel: z.string().optional(),
    category: frameworkCategorySchema.optional(),
  })
  .and(workItemFieldsSchema);

const updateUserStoryPayloadSchema = z.object({
  storyId: z.string().trim().min(1, 'Payload invalido'),
  updates: workItemFieldsPartialSchema,
  estimationUpdates: z
    .looseObject({
      points: z.number().optional(),
      durationMinutes: z.number().optional(),
      durationLabel: z.string().optional(),
      justification: z.string().optional(),
      isModified: z.boolean().optional(),
    })
    .optional(),
  prioritizationUpdates: z
    .looseObject({
      category: frameworkCategorySchema.optional(),
      justification: z.string().optional(),
      isModified: z.boolean().optional(),
    })
    .optional(),
  epicId: z.string().optional(),
  sprintId: z.string().nullable().optional(),
});

const executionPatchSchema = z.looseObject({
  status: kanbanStatusSchema.optional(),
  assigneeId: z.string().nullable().optional(),
  columnOrder: z.number().optional(),
});

export const workspacePostSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approveAgent1'),
    payload: looseObjectSchema,
    ...projectIdField,
  }),
  z.object({
    action: z.literal('approveAgent2'),
    payload: looseObjectSchema,
    ...projectIdField,
  }),
  z.object({
    action: z.literal('approveAgent3'),
    payload: looseObjectSchema,
    ...projectIdField,
  }),
  z.object({
    action: z.literal('approveAgent4'),
    payload: looseObjectSchema,
    ...projectIdField,
  }),
  z.object({
    action: z.literal('approveAgent5'),
    payload: looseObjectSchema,
    ...projectIdField,
  }),
  z.object({
    action: z.literal('bootstrapDashboardFromAgent4'),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('createUserStory'),
    payload: createUserStoryPayloadSchema,
    ...projectIdField,
  }),
  z.object({
    action: z.literal('deleteUserStory'),
    payload: z.object({
      storyId: z.string().trim().min(1, 'Payload invalido'),
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('updateUserStory'),
    payload: updateUserStoryPayloadSchema,
    ...projectIdField,
  }),
  z.object({
    action: z.literal('createEpic'),
    payload: z.object({
      title: z.string().trim().min(1, 'Payload invalido'),
      description: z.string().trim().min(1, 'Payload invalido'),
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('updateEpic'),
    payload: z
      .object({
        epicId: z.string().trim().min(1, 'Payload invalido'),
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .refine(
        (p) => p.title !== undefined || p.description !== undefined,
        'Payload invalido'
      ),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('deleteEpic'),
    payload: z.object({
      epicId: z.string().trim().min(1, 'Payload invalido'),
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('updateSprintPlan'),
    payload: z.object({
      plan: looseObjectSchema,
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('startSprint'),
    payload: z.object({
      sprintId: z.string().trim().min(1, 'Payload invalido'),
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('completeSprint'),
    payload: z.object({
      sprintId: z.string().trim().min(1, 'Payload invalido'),
      rollover: sprintCompleteRolloverSchema.optional(),
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('initializeExecution'),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('upsertProjectMember'),
    payload: z.object({
      member: z.object({
        id: z.string().optional(),
        displayName: z.string().trim().min(1, 'Payload invalido'),
        email: z.string().optional(),
        role: projectMemberRoleSchema,
      }),
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('deleteProjectMember'),
    payload: z.object({
      memberId: z.string().trim().min(1, 'Payload invalido'),
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('updateStoryExecution'),
    payload: z.object({
      storyId: z.string().trim().min(1, 'Payload invalido'),
      patch: executionPatchSchema,
      previous: z
        .looseObject({
          status: kanbanStatusSchema.optional(),
          assigneeId: z.string().nullable().optional(),
        })
        .optional(),
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('bulkUpdateStoryExecutions'),
    payload: z.object({
      updates: z
        .array(
          z.object({
            storyId: z.string().trim().min(1),
            status: kanbanStatusSchema,
            columnOrder: z.number(),
            previousStatus: kanbanStatusSchema.optional(),
          })
        )
        .min(1, 'Payload invalido'),
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('updateExecutionSprintFilter'),
    payload: z.object({
      sprintFilter: z.string().min(1, 'Payload invalido'),
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('saveStack'),
    payload: z.looseObject({
      layers: looseObjectSchema,
    }),
    ...projectIdField,
  }),
  z.object({
    action: z.literal('clearStack'),
    ...projectIdField,
  }),
  z.object({ action: z.literal('resetAgent1'), ...projectIdField }),
  z.object({ action: z.literal('resetAgent2'), ...projectIdField }),
  z.object({ action: z.literal('resetAgent3'), ...projectIdField }),
  z.object({ action: z.literal('resetAgent4'), ...projectIdField }),
  z.object({ action: z.literal('resetAgent5'), ...projectIdField }),
  z.object({ action: z.literal('resetWorkspace'), ...projectIdField }),
]);

export type WorkspacePatchBody = z.infer<typeof workspacePatchSchema>;
export type WorkspacePostBody = z.infer<typeof workspacePostSchema>;
