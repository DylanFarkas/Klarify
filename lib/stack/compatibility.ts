/**
 * @fileoverview Validación de coherencia del stack tecnológico.
 */

import { getTechById } from '@/lib/constants/tech-catalog';
import type {
  ProjectStack,
  StackItem,
  StackLayerId,
  StackWarning,
} from '@/lib/types/stack';
import { PRIMARY_STACK_LAYERS } from '@/lib/types/stack';

function collectCatalogIds(stack: ProjectStack): string[] {
  const ids: string[] = [];
  for (const items of Object.values(stack.layers)) {
    if (!items) continue;
    for (const item of items) {
      if (item.catalogId) ids.push(item.catalogId);
    }
  }
  return ids;
}

function getPrimaryIds(stack: ProjectStack, layer: StackLayerId): string[] {
  const items = stack.layers[layer] ?? [];
  return items.filter((i) => i.isPrimary && i.catalogId).map((i) => i.catalogId!);
}

export function validateStackCompatibility(stack: ProjectStack): StackWarning[] {
  const warnings: StackWarning[] = [];
  const allIds = collectCatalogIds(stack);

  // Múltiples primarios en la misma capa
  for (const layer of PRIMARY_STACK_LAYERS) {
    const primaries = (stack.layers[layer] ?? []).filter((i) => i.isPrimary);
    if (primaries.length > 1) {
      warnings.push({
        code: 'MULTIPLE_PRIMARY',
        message: `Hay más de un ${layer} primario. Elige uno como principal.`,
        severity: 'error',
      });
    }
    if (primaries.length === 0 && (stack.layers[layer]?.length ?? 0) > 1) {
      warnings.push({
        code: 'NO_PRIMARY',
        message: `Marca un ${layer} como primario para claridad.`,
        severity: 'warning',
      });
    }
  }

  // Conflictos explícitos del catálogo
  for (const id of allIds) {
    const tech = getTechById(id);
    if (!tech?.conflicts) continue;
    for (const conflictId of tech.conflicts) {
      if (allIds.includes(conflictId)) {
        const other = getTechById(conflictId);
        warnings.push({
          code: 'CATALOG_CONFLICT',
          message: `${tech.name} y ${other?.name ?? conflictId} suelen ser alternativas, no complementos.`,
          severity: 'error',
        });
      }
    }
  }

  // Dos frameworks frontend primarios
  const frontendPrimaries = getPrimaryIds(stack, 'frontend');
  const frontendFrameworks = frontendPrimaries.filter((id) => {
    const t = getTechById(id);
    return t?.primaryEligible;
  });
  if (frontendFrameworks.length > 1) {
    warnings.push({
      code: 'MULTIPLE_FRONTEND_FRAMEWORKS',
      message: 'Solo un framework frontend primario (React, Vue, Angular, etc.).',
      severity: 'error',
    });
  }

  // Dos backends primarios
  const backendPrimaries = getPrimaryIds(stack, 'backend');
  const backendFrameworks = backendPrimaries.filter((id) => getTechById(id)?.primaryEligible);
  if (backendFrameworks.length > 1) {
    warnings.push({
      code: 'MULTIPLE_BACKEND_FRAMEWORKS',
      message: 'Solo un runtime/backend primario (Node, Python, Go, etc.).',
      severity: 'error',
    });
  }

  // Implicaciones faltantes (warning)
  for (const id of allIds) {
    const tech = getTechById(id);
    if (!tech?.implies) continue;
    for (const impliedId of tech.implies) {
      if (!allIds.includes(impliedId)) {
        const implied = getTechById(impliedId);
        warnings.push({
          code: 'MISSING_IMPLIED',
          message: `${tech.name} suele ir con ${implied?.name ?? impliedId}.`,
          severity: 'warning',
        });
      }
    }
  }

  // Mobile nativo + SPA web sin contexto
  const hasMobileNative = allIds.some((id) =>
    ['react-native', 'flutter', 'swift', 'kotlin-mobile'].includes(id)
  );
  const hasWebSpa = frontendFrameworks.some((id) =>
    ['react', 'vue', 'angular', 'svelte'].includes(id)
  );
  if (hasMobileNative && hasWebSpa && !stack.productKind.toLowerCase().includes('multi')) {
    warnings.push({
      code: 'MOBILE_WEB_MIX',
      message:
        'Combinas mobile nativo/cross-platform con SPA web. Confirma que el producto es multi-plataforma.',
      severity: 'warning',
    });
  }

  return warnings;
}

export function hasBlockingStackWarnings(warnings: StackWarning[]): boolean {
  return warnings.some((w) => w.severity === 'error');
}

/** Sugiere ítems implícitos al añadir uno del catálogo */
export function getImpliedItems(catalogId: string): StackItem[] {
  const tech = getTechById(catalogId);
  if (!tech?.implies) return [];
  return tech.implies.map((id) => ({
    catalogId: id,
    isPrimary: false,
  }));
}

/** Detecta conflicto al añadir un ítem a una capa */
export function findAddConflict(
  stack: ProjectStack,
  catalogId: string,
  layer: StackLayerId
): { conflictId: string; message: string } | null {
  const tech = getTechById(catalogId);
  if (!tech) return null;

  const existingIds = collectCatalogIds(stack);
  for (const conflictId of tech.conflicts ?? []) {
    if (existingIds.includes(conflictId)) {
      const other = getTechById(conflictId);
      return {
        conflictId,
        message: `${tech.name} entra en conflicto con ${other?.name ?? conflictId} ya seleccionado.`,
      };
    }
  }

  if (tech.primaryEligible && PRIMARY_STACK_LAYERS.includes(layer)) {
    const existingPrimary = (stack.layers[layer] ?? []).find(
      (i) => i.isPrimary && i.catalogId && i.catalogId !== catalogId
    );
    if (existingPrimary?.catalogId) {
      const other = getTechById(existingPrimary.catalogId);
      if (getTechById(existingPrimary.catalogId)?.primaryEligible) {
        return {
          conflictId: existingPrimary.catalogId,
          message: `¿Reemplazar ${other?.name ?? existingPrimary.catalogId} por ${tech.name} como primario?`,
        };
      }
    }
  }

  return null;
}

export function normalizeStackLayers(
  layers: ProjectStack['layers']
): ProjectStack['layers'] {
  const normalized: ProjectStack['layers'] = {};
  for (const [layer, items] of Object.entries(layers)) {
    if (!items?.length) continue;
    const seen = new Set<string>();
    const deduped: StackItem[] = [];
    for (const item of items) {
      const key = item.catalogId ?? `custom:${item.customName?.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    normalized[layer as StackLayerId] = deduped;
  }
  return normalized;
}
