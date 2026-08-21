/**
 * @fileoverview Tablero de capas del stack tecnológico.
 */

'use client';

import { getTechById } from '@/lib/constants/tech-catalog';
import { StackTechIcon } from '@/components/agents/stack/StackTechIcon';
import type { ProjectStack, StackItem, StackLayerId } from '@/lib/types/stack';
import { ALL_STACK_LAYERS, STACK_LAYER_LABELS, getStackItemLabel } from '@/lib/types/stack';

interface StackBoardProps {
  stack: ProjectStack;
  editing?: boolean;
  onRemoveItem?: (layer: StackLayerId, index: number) => void;
  onAddToLayer?: (layer: StackLayerId) => void;
  onEditMeta?: () => void;
}

function TechChip({
  item,
  editing,
  onRemove,
}: {
  item: StackItem;
  editing?: boolean;
  onRemove?: () => void;
}) {
  const label = getStackItemLabel(item, (id) => getTechById(id));
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted/30 px-2 py-1 text-[13px] font-medium text-foreground">
      <StackTechIcon item={item} size={18} />
      {label}
      {item.isPrimary ? (
        <span className="text-[10px] font-normal text-subtle">· primario</span>
      ) : null}
      {editing && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded p-0.5 text-subtle hover:bg-surface-hover hover:text-foreground"
          aria-label={`Quitar ${label}`}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

export function StackBoard({
  stack,
  editing = false,
  onRemoveItem,
  onAddToLayer,
  onEditMeta,
}: StackBoardProps) {
  const visibleLayers = ALL_STACK_LAYERS.filter(
    (layer) => (stack.layers[layer]?.length ?? 0) > 0 || editing
  );

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">Producto</p>
          <p className="text-[15px] font-semibold tracking-tight text-foreground">
            {stack.productKind || 'Sin definir'}
          </p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
            Arquitectura
          </p>
          <p className="text-sm text-muted">{stack.architecturePattern || 'Sin definir'}</p>
        </div>
        {editing && onEditMeta ? (
          <button
            type="button"
            onClick={onEditMeta}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Editar producto
          </button>
        ) : null}
      </div>

      <div className="divide-y divide-border">
        {visibleLayers.map((layer) => {
          const items = stack.layers[layer] ?? [];
          return (
            <div
              key={layer}
              className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-4 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)]"
            >
              <p className="pt-0.5 text-xs font-medium text-subtle">{STACK_LAYER_LABELS[layer]}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, index) => (
                  <TechChip
                    key={`${item.catalogId ?? item.customName}-${index}`}
                    item={item}
                    editing={editing}
                    onRemove={
                      onRemoveItem ? () => onRemoveItem(layer, index) : undefined
                    }
                  />
                ))}
                {editing && onAddToLayer ? (
                  <button
                    type="button"
                    onClick={() => onAddToLayer(layer)}
                    className="inline-flex items-center rounded-lg border border-dashed border-border px-2 py-1 text-xs text-muted transition-colors hover:border-border-strong hover:text-foreground cursor-pointer"
                  >
                    + Añadir
                  </button>
                ) : null}
                {!editing && items.length === 0 ? (
                  <span className="text-xs text-subtle">—</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {stack.warnings && stack.warnings.length > 0 ? (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] font-medium text-subtle">Compatibilidad</p>
          <ul className="mt-1.5 space-y-1">
            {stack.warnings.map((w) => (
              <li
                key={w.code + w.message}
                className={[
                  'text-xs leading-relaxed',
                  w.severity === 'error' ? 'text-danger' : 'text-muted',
                ].join(' ')}
              >
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {stack.rationale ? (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] font-medium text-subtle">Justificación</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted whitespace-pre-wrap">
            {stack.rationale}
          </p>
        </div>
      ) : null}

      {stack.sources && stack.sources.length > 0 ? (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] font-medium text-subtle">Fuentes</p>
          <ul className="mt-1.5 space-y-1">
            {stack.sources.slice(0, 6).map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
