/**
 * @fileoverview Enums Zod compartidos entre boundaries (API, harness).
 */

import * as z from 'zod';

export const estimationModeSchema = z.enum(['story_points', 'time'], {
  error: 'Debes elegir un modo de estimación (Story Points o tiempo).',
});

export const prioritizationFrameworkSchema = z.enum(
  ['moscow', 'wsjf', 'rice', 'value-effort'],
  { error: 'Framework de priorización inválido.' }
);

export const frameworkCategorySchema = z.enum(
  [
    'must',
    'should',
    'could',
    'wont',
    'critical',
    'high',
    'medium',
    'low',
    'quick-win',
    'major-project',
    'fill-in',
    'thankless',
    'high-value-low-effort',
    'high-value-high-effort',
    'low-value-low-effort',
    'low-value-high-effort',
  ],
  { error: 'Categoría de prioridad inválida.' }
);

export const kanbanStatusSchema = z.enum(
  ['todo', 'in_progress', 'code_review', 'done'],
  { error: 'Estado Kanban inválido.' }
);

export const projectMemberRoleSchema = z.enum(
  ['scrum_master', 'product_owner', 'developer', 'qa', 'designer'],
  { error: 'Rol de miembro inválido.' }
);

export const sprintCompleteRolloverSchema = z.enum(['backlog', 'next_planned']);

export const aiProviderIdSchema = z.enum(['deepseek', 'openai', 'gemini'], {
  error: 'Proveedor inválido. Usa deepseek, openai o gemini.',
});

export const workspaceAgentIdSchema = z.enum([
  'agent1',
  'agent2',
  'agent3',
  'agent4',
  'agent5',
]);

/** Objeto JSON laxo: no strippea campos (PATCH de estado, payloads de approve). */
export const looseObjectSchema = z.record(z.string(), z.unknown());
