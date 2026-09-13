/**
 * @fileoverview Normalización de stack desde LLM o input manual.
 */

import {
  getTechById,
  resolveTechFromStackItem,
  resolveTechPartsFromLabel,
  splitCompoundTechLabel,
} from '@/lib/constants/tech-catalog';
import { normalizeStackLayers, validateStackCompatibility } from '@/lib/stack/compatibility';
import type {
  ProjectStack,
  StackItem,
  StackLayerId,
  StackRecommendRaw,
  StackSource,
  StackSourceRef,
} from '@/lib/types/stack';
import { createEmptyStack } from '@/lib/types/stack';

function assignPrimaryFlag(items: StackItem[], isPrimary?: boolean, layer?: StackLayerId): void {
  if (!isPrimary || items.length === 0) return;

  for (const item of items) {
    if (!item.catalogId) continue;
    const tech = getTechById(item.catalogId);
    if (tech?.primaryEligible && (!layer || tech.layer === layer)) {
      item.isPrimary = true;
      return;
    }
  }

  items[0].isPrimary = true;
}

/**
 * Convierte la salida cruda del LLM en ítems del stack.
 * Expande customName compuestos ("React + TypeScript") en etiquetas del catálogo cuando existan.
 */
export function stackItemsFromRaw(
  raw: {
    catalogId?: string;
    customName?: string;
    isPrimary?: boolean;
  },
  layer?: StackLayerId
): StackItem[] {
  if (raw.catalogId?.trim()) {
    const tech =
      getTechById(raw.catalogId) ??
      resolveTechFromStackItem({ catalogId: raw.catalogId, customName: raw.customName });
    if (tech) {
      return [{ catalogId: tech.id, isPrimary: raw.isPrimary ?? false }];
    }
  }

  const label = raw.customName?.trim() || raw.catalogId?.trim();
  if (!label) return [];

  const whole = resolveTechFromStackItem({ customName: label, catalogId: raw.catalogId });
  if (whole) {
    return [{ catalogId: whole.id, isPrimary: raw.isPrimary ?? false }];
  }

  const segments = splitCompoundTechLabel(label);

  if (segments.length <= 1) {
    const expanded = resolveTechPartsFromLabel(label, layer);
    if (expanded.length > 0) {
      const singleItems = expanded.map((tech) => ({
        catalogId: tech.id,
        isPrimary: false,
      }));
      assignPrimaryFlag(singleItems, raw.isPrimary, layer);
      return singleItems;
    }
    return [{ customName: label, isPrimary: raw.isPrimary ?? false }];
  }

  const items: StackItem[] = [];
  const unmatched: string[] = [];

  for (const segment of segments) {
    const resolved = resolveTechPartsFromLabel(segment, layer);
    if (resolved.length > 0) {
      for (const tech of resolved) {
        if (!items.some((item) => item.catalogId === tech.id)) {
          items.push({ catalogId: tech.id, isPrimary: false });
        }
      }
      continue;
    }
    unmatched.push(segment);
  }

  if (items.length === 0) {
    return [{ customName: label, isPrimary: raw.isPrimary ?? false }];
  }

  for (const segment of unmatched) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    if (!items.some((item) => item.customName?.toLowerCase() === trimmed.toLowerCase())) {
      items.push({ customName: trimmed, isPrimary: false });
    }
  }

  assignPrimaryFlag(items, raw.isPrimary, layer);
  return items;
}

export function stackItemFromRaw(raw: {
  catalogId?: string;
  customName?: string;
  isPrimary?: boolean;
}): StackItem | null {
  return stackItemsFromRaw(raw)[0] ?? null;
}

export function buildStackFromRecommendRaw(
  raw: StackRecommendRaw,
  source: StackSource,
  sources?: StackSourceRef[],
  status: ProjectStack['status'] = 'saved'
): ProjectStack {
  const layers: ProjectStack['layers'] = {};

  for (const layer of Object.keys(raw.layers) as StackLayerId[]) {
    const rawItems = raw.layers[layer];
    if (!rawItems?.length) continue;
    const items: StackItem[] = [];
    for (const r of rawItems) {
      items.push(...stackItemsFromRaw(r, layer));
    }
    if (items.length) layers[layer] = items;
  }

  const stack: ProjectStack = {
    status,
    source,
    productKind: raw.productKind.trim(),
    architecturePattern: raw.architecturePattern.trim(),
    layers: normalizeStackLayers(layers),
    rationale: raw.rationale.trim(),
    updatedAt: Date.now(),
  };

  if (sources?.length) {
    stack.sources = sources;
  }

  stack.warnings = validateStackCompatibility(stack);
  return prepareStackForFirestore(stack);
}

export function mergeStackUpdate(
  current: ProjectStack | undefined,
  update: Partial<ProjectStack>
): ProjectStack {
  const base = current ?? createEmptyStack();
  const merged: ProjectStack = {
    ...base,
    ...update,
    layers: normalizeStackLayers(update.layers ?? base.layers),
    updatedAt: Date.now(),
  };
  merged.warnings = validateStackCompatibility(merged);
  return prepareStackForFirestore(merged);
}

export function countStackItems(stack: ProjectStack): number {
  let count = 0;
  for (const items of Object.values(stack.layers)) {
    count += items?.length ?? 0;
  }
  return count;
}

export function isStackEmpty(stack: ProjectStack | undefined | null): boolean {
  if (!stack) return true;
  if (stack.status === 'empty') return true;
  return countStackItems(stack) === 0 && !stack.productKind && !stack.architecturePattern;
}

export function normalizeStackFromToolArgs(
  raw: StackRecommendRaw,
  source: StackSource = 'ai'
): ProjectStack {
  return prepareStackForFirestore(buildStackFromRecommendRaw(raw, source));
}

function expandLayerItems(items: StackItem[], layer: StackLayerId): StackItem[] {
  const expanded: StackItem[] = [];
  for (const item of items) {
    if (item.catalogId) {
      expanded.push(item);
      continue;
    }
    if (item.customName?.trim()) {
      expanded.push(
        ...stackItemsFromRaw(
          { customName: item.customName, isPrimary: item.isPrimary },
          layer
        )
      );
      continue;
    }
  }
  return expanded;
}

export function prepareStackForFirestore(stack: ProjectStack): ProjectStack {
  const expandedLayers: ProjectStack['layers'] = {};
  for (const [layer, items] of Object.entries(stack.layers)) {
    if (!items?.length) continue;
    const expanded = expandLayerItems(items, layer as StackLayerId);
    if (expanded.length) expandedLayers[layer as StackLayerId] = expanded;
  }

  const cleaned: ProjectStack = {
    status: stack.status,
    source: stack.source,
    productKind: stack.productKind.trim(),
    architecturePattern: stack.architecturePattern.trim(),
    layers: normalizeStackLayers(expandedLayers),
    updatedAt: stack.updatedAt || Date.now(),
  };

  if (stack.rationale?.trim()) {
    cleaned.rationale = stack.rationale.trim();
  }

  const warnings = stack.warnings?.filter((w) => w.message?.trim());
  if (warnings?.length) {
    cleaned.warnings = warnings;
  }

  const sources = stack.sources?.filter((s) => s.title?.trim() && s.url?.trim());
  if (sources?.length) {
    cleaned.sources = sources;
  }

  return cleaned;
}
