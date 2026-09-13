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
    <span className="group/chip inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2 py-1 text-[13px] font-medium text-foreground">
      <StackTechIcon item={item} size={18} />
      <span className="truncate">{label}</span>
      {item.isPrimary ? (
        <span className="shrink-0 text-[10px] font-normal text-subtle">· primario</span>
      ) : null}
      {editing && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 shrink-0 cursor-pointer rounded p-0.5 text-subtle opacity-100 transition-colors hover:bg-danger/10 hover:text-danger sm:opacity-0 sm:group-hover/chip:opacity-100"
          aria-label={`Quitar ${label}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </span>
  );
}

export function StackBoard({
  stack,
  editing = false,
  onRemoveItem,
  onEditMeta,
}: StackBoardProps) {
  const visibleLayers = ALL_STACK_LAYERS.filter(
    (layer) => (stack.layers[layer]?.length ?? 0) > 0
  );

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <p className="text-[11px] font-medium text-subtle">Producto</p>
            <p className="mt-0.5 font-mono text-[15px] font-semibold tracking-tight text-foreground">
              {stack.productKind || 'Sin definir'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-subtle">Arquitectura</p>
            <p className="mt-0.5 text-sm text-muted">
              {stack.architecturePattern || 'Sin definir'}
            </p>
          </div>
        </div>
        {onEditMeta ? (
          <button
            type="button"
            onClick={onEditMeta}
            className="shrink-0 cursor-pointer rounded-md bg-surface-muted px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Editar producto
          </button>
        ) : null}
      </div>

      <div className="flex flex-col">
        {visibleLayers.map((layer) => {
          const items = stack.layers[layer] ?? [];
          return (
            <div
              key={layer}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-x-4 border-b border-border/50 py-3 last:border-b-0 sm:grid-cols-[8rem_minmax(0,1fr)]"
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
              </div>
            </div>
          );
        })}
      </div>

      {stack.warnings && stack.warnings.length > 0 ? (
        <div className="border-t border-border/60 pt-4">
          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Compatibilidad</p>
          <ul className="mt-1.5 space-y-1">
            {stack.warnings.map((w) => (
              <li
                key={w.code + w.message}
                className={[
                  'text-sm leading-relaxed',
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
        <div className="border-t border-border/60 pt-4">
          <p className="text-[11px] font-medium text-subtle">Justificación</p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {stack.rationale}
          </p>
        </div>
      ) : null}

      {stack.sources && stack.sources.length > 0 ? (
        <div className="border-t border-border/60 pt-4">
          <p className="text-[11px] font-medium text-subtle">Fuentes</p>
          <ul className="mt-1.5 space-y-1">
            {stack.sources.slice(0, 6).map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline"
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
