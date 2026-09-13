/**
 * @fileoverview Servicio de recomendación y contexto para el módulo Stack.
 */

import { LlmStackAdapter, MockStackAdapter } from '@/lib/adapters/stack/LlmStackAdapter';
import {
  buildProjectContextForStack,
  formatStackLayerGuidance,
  inferStackLayerRequirements,
  pruneStackToAllowedLayers,
} from '@/lib/stack/layer-requirements';
import { buildStackFromRecommendRaw } from '@/lib/stack/normalize';
import { resolveLlmCredentials } from '@/lib/llm/resolve';
import type { UserWorkspace } from '@/lib/types/workspace';
import type { ProjectStack, StackRecommendResponse } from '@/lib/types/stack';
import { getLiveBacklog } from '@/lib/utils/live-backlog';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

function summarizeBacklogForStack(workspace: UserWorkspace): string {
  const live = getLiveBacklog(workspace);
  if (live.epics.length === 0) return 'Backlog vacío.';

  const lines: string[] = [];
  lines.push(`Épicas: ${live.epics.length}, historias: ${live.epics.reduce((n, e) => n + e.userStories.length, 0)}`);
  lines.push(`Estimación: ${live.estimationMode ?? 'story_points'}`);

  for (const epic of live.epics.slice(0, 12)) {
    lines.push(`\n### ${epic.id}: ${epic.title}`);
    lines.push(epic.description.slice(0, 200));
    for (const story of epic.userStories.slice(0, 6)) {
      lines.push(`- ${story.id} [${story.type}]: ${story.title}`);
      if (story.acceptanceCriteria.length) {
        lines.push(`  CA: ${story.acceptanceCriteria.slice(0, 2).join('; ')}`);
      }
    }
    if (epic.userStories.length > 6) {
      lines.push(`  … +${epic.userStories.length - 6} historias más`);
    }
  }
  return lines.join('\n');
}

function buildWishesText(workspace: UserWorkspace): string {
  const wishes = workspace.agent1.wishes ?? [];
  if (wishes.length === 0) return '';
  return wishes.map((w, i) => `${i + 1}. [${w.id}] ${w.text}`).join('\n');
}

function buildEnrichedContext(workspace: UserWorkspace): string {
  const parts: string[] = [];
  if (workspace.agent1.enrichedContext) {
    parts.push(workspace.agent1.enrichedContext);
  }
  const d = workspace.agent1.discovery;
  if (d?.summary) parts.push(`Discovery: ${d.summary}`);
  if (d?.gaps?.length) parts.push(`Gaps: ${d.gaps.join(', ')}`);
  return parts.join('\n\n');
}

export async function recommendProjectStack(
  uid: string,
  workspace: UserWorkspace,
  onThought: LLMThoughtCallback
): Promise<StackRecommendResponse> {
  const contextText = buildProjectContextForStack(workspace);
  const layerRequirements = inferStackLayerRequirements(contextText);
  const layerGuidance = formatStackLayerGuidance(layerRequirements);

  const context = {
    projectSummary: `Pipeline completado. Priorización: ${workspace.agent4.framework ?? 'moscow'}.`,
    wishesText: buildWishesText(workspace),
    enrichedContext: buildEnrichedContext(workspace),
    backlogSummary: summarizeBacklogForStack(workspace),
    layerGuidance,
  };

  const credentials = await resolveLlmCredentials(uid);
  const adapter = credentials ? new LlmStackAdapter(credentials) : new MockStackAdapter();

  const raw = await adapter.recommendStack(context, onThought);
  let stack = buildStackFromRecommendRaw(raw, 'ai');
  stack = pruneStackToAllowedLayers(stack, layerRequirements);

  return { stack };
}

export function buildStackRecommendationGuidance(workspace: UserWorkspace): string {
  const contextText = buildProjectContextForStack(workspace);
  return formatStackLayerGuidance(inferStackLayerRequirements(contextText));
}

export function buildStackContextSummary(workspace: UserWorkspace): string {
  const stack = workspace.stack;
  const layerGuidance = buildStackRecommendationGuidance(workspace);

  if (!stack || stack.status === 'empty') {
    return `Stack no definido.\n${layerGuidance}`;
  }

  const lines = [
    `Producto: ${stack.productKind || '—'}`,
    `Arquitectura: ${stack.architecturePattern || '—'}`,
    `Fuente: ${stack.source}`,
  ];
  for (const [layer, items] of Object.entries(stack.layers)) {
    if (!items?.length) continue;
    const names = items
      .map((i) => (i.catalogId ? i.catalogId : i.customName))
      .join(', ');
    lines.push(`${layer}: ${names}`);
  }
  if (stack.rationale) lines.push(`Justificación: ${stack.rationale.slice(0, 400)}`);
  lines.push(layerGuidance);
  return lines.join('\n');
}

export type { ProjectStack };
