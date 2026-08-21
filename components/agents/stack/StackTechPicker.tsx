/**
 * @fileoverview Paleta de búsqueda para elegir tecnologías del catálogo o custom.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { searchTechCatalog, getTechCatalogByLayer } from '@/lib/constants/tech-catalog';
import { StackTechIconById } from '@/components/agents/stack/StackTechIcon';
import type { StackLayerId } from '@/lib/types/stack';
import { ALL_STACK_LAYERS, STACK_LAYER_LABELS } from '@/lib/types/stack';

interface StackTechPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (catalogId: string, layer: StackLayerId) => void;
  onAddCustom: (name: string, layer: StackLayerId) => void;
  initialLayer?: StackLayerId;
}

export function StackTechPicker({
  open,
  onClose,
  onSelect,
  onAddCustom,
  initialLayer = 'frontend',
}: StackTechPickerProps) {
  const [query, setQuery] = useState('');
  const [layer, setLayer] = useState<StackLayerId>(initialLayer);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setLayer(initialLayer);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialLayer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim();
    const pool = q ? searchTechCatalog(q, layer) : getTechCatalogByLayer(layer);
    return pool.slice(0, q ? 30 : 60);
  }, [query, layer]);

  const showCustom =
    query.trim().length >= 2 &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-start justify-center bg-background/70 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={handleBackdrop}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-lg animate-[fadeIn_0.2s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-label="Elegir tecnología"
      >
        <div className="border-b border-border px-4 py-3">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tecnología…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {ALL_STACK_LAYERS.slice(0, 8).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLayer(l)}
                className={[
                  'rounded-md px-2 py-0.5 text-[11px] transition-colors cursor-pointer',
                  layer === l
                    ? 'bg-surface-hover text-foreground font-medium'
                    : 'text-subtle hover:bg-surface-hover hover:text-muted',
                ].join(' ')}
              >
                {STACK_LAYER_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        <ul className="max-h-[min(360px,50vh)] overflow-y-auto py-1">
          {results.map((tech) => (
            <li key={tech.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover/40 cursor-pointer"
                onClick={() => {
                  onSelect(tech.id, tech.layer);
                  onClose();
                }}
              >
                <StackTechIconById catalogId={tech.id} size={22} />
                <span className="font-medium text-foreground">{tech.name}</span>
                {tech.tags?.includes('baas') ? (
                  <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-subtle">
                    BaaS
                  </span>
                ) : null}
                <span className="ml-auto text-xs text-subtle">
                  {tech.tags?.includes('baas') ? 'Backend · BaaS' : STACK_LAYER_LABELS[tech.layer]}
                </span>
              </button>
            </li>
          ))}

          {showCustom ? (
            <li className="border-t border-border">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-foreground hover:bg-surface-hover/40"
                onClick={() => {
                  onAddCustom(query.trim(), layer);
                  onClose();
                }}
              >
                <span className="flex h-5.5 w-5.5 items-center justify-center rounded-md border border-dashed border-border text-subtle">
                  +
                </span>
                Añadir «{query.trim()}» en {STACK_LAYER_LABELS[layer]}
              </button>
            </li>
          ) : null}

          {results.length === 0 && !showCustom ? (
            <li className="px-4 py-8 text-center text-sm text-muted">Sin resultados</li>
          ) : null}
        </ul>
      </div>
    </div>,
    document.body
  );
}
