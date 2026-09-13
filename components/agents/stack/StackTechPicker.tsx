/**
 * @fileoverview Paleta para elegir tecnologías — estilo modal de configuración.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { searchTechCatalog, getTechCatalogByLayer } from '@/lib/constants/tech-catalog';
import { StackTechIconById } from '@/components/agents/stack/StackTechIcon';
import type { StackLayerId, TechCatalogEntry } from '@/lib/types/stack';
import { ALL_STACK_LAYERS, STACK_LAYER_LABELS } from '@/lib/types/stack';

type LayerFilter = StackLayerId | 'all';

interface StackTechPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (catalogId: string, layer: StackLayerId) => void;
  onDeselect?: (catalogId: string) => void;
  onAddCustom: (name: string, layer: StackLayerId) => void;
  initialLayer?: StackLayerId;
  selectedCatalogIds?: readonly string[];
}

const LAYER_DESCRIPTIONS: Record<StackLayerId, string> = {
  frontend: 'Frameworks y librerías de interfaz',
  backend: 'APIs, servidores y BaaS',
  database: 'Bases de datos y almacenes',
  auth: 'Identidad y control de acceso',
  hosting: 'Despliegue e infraestructura',
  styling: 'CSS, design systems y UI kits',
  orm: 'ORMs y acceso a datos',
  realtime: 'WebSockets, sync y eventos',
  storage: 'Archivos y media',
  testing: 'Unit, e2e y calidad',
  payments: 'Cobros y facturación',
  mobile: 'Apps nativas e híbridas',
  cms: 'Contenido y headless CMS',
  messaging: 'Email, chat y notificaciones',
  monitoring: 'Logs, métricas y alertas',
  devops: 'CI/CD y automatización',
};

const LAYER_ICONS: Record<StackLayerId, ReactNode> = {
  frontend: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  backend: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
    </svg>
  ),
  database: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  auth: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  hosting: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  styling: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  orm: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  ),
  realtime: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  storage: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  testing: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  payments: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  mobile: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  cms: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  messaging: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  monitoring: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  devops: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const ALL_ICON = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

function layerBadge(tech: TechCatalogEntry): string {
  if (tech.tags?.includes('baas')) return 'BaaS';
  return STACK_LAYER_LABELS[tech.layer];
}

export function StackTechPicker({
  open,
  onClose,
  onSelect,
  onDeselect,
  onAddCustom,
  initialLayer = 'frontend',
  selectedCatalogIds = [],
}: StackTechPickerProps) {
  const [query, setQuery] = useState('');
  const [layer, setLayer] = useState<LayerFilter>(initialLayer);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedSet = useMemo(() => new Set(selectedCatalogIds), [selectedCatalogIds]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setLayer(initialLayer);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open, initialLayer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const isSearching = query.trim().length > 0;

  const results = useMemo(() => {
    const q = query.trim();
    if (q) return searchTechCatalog(q).slice(0, 48);
    if (layer === 'all') return TECH_CATALOG_PREVIEW;
    return getTechCatalogByLayer(layer).slice(0, 60);
  }, [query, layer]);

  const showCustom =
    query.trim().length >= 2 &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  const customTargetLayer: StackLayerId = layer === 'all' ? 'frontend' : layer;

  const panelTitle = isSearching
    ? 'Resultados'
    : layer === 'all'
      ? 'Todas las capas'
      : STACK_LAYER_LABELS[layer];

  const panelDescription = isSearching
    ? `${results.length} coincidencia${results.length !== 1 ? 's' : ''} en el catálogo`
    : layer === 'all'
      ? 'Un vistazo rápido de cada capa'
      : LAYER_DESCRIPTIONS[layer];

  const toggleTech = useCallback(
    (tech: TechCatalogEntry) => {
      if (selectedSet.has(tech.id)) {
        onDeselect?.(tech.id);
        return;
      }
      onSelect(tech.id, tech.layer);
    },
    [onDeselect, onSelect, selectedSet]
  );

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-background/75 backdrop-blur-md"
        onClick={onClose}
        aria-label="Cerrar selector de tecnología"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stack-tech-picker-title"
        className={[
          'relative z-10 flex w-full max-w-3xl flex-col overflow-hidden',
          'rounded-t-2xl border border-border/70 bg-surface shadow-2xl sm:rounded-2xl',
          'h-[min(92vh,720px)] animate-[slideUp_0.25s_ease-out] sm:animate-[fadeIn_0.2s_ease-out]',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.04em] text-subtle">Stack</p>
            <h2
              id="stack-tech-picker-title"
              className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px] sm:leading-tight"
            >
              Añadir tecnología
            </h2>
            <p className="mt-1.5 text-[13px] text-muted">
              Elige del catálogo o busca en todas las capas
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl p-2 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col border-t border-border/60 sm:flex-row">
          <nav
            className={[
              'shrink-0 border-border/60 bg-surface-muted/40',
              'flex gap-1 overflow-x-auto border-b p-2.5',
              'sm:w-52 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:border-b-0 sm:border-r sm:p-3',
            ].join(' ')}
            aria-label="Capas del stack"
          >
            <LayerNavItem
              active={!isSearching && layer === 'all'}
              label="Todas"
              icon={ALL_ICON}
              onClick={() => {
                setLayer('all');
                setQuery('');
                inputRef.current?.focus();
              }}
            />
            {ALL_STACK_LAYERS.map((l) => (
              <LayerNavItem
                key={l}
                active={!isSearching && layer === l}
                label={STACK_LAYER_LABELS[l]}
                icon={LAYER_ICONS[l]}
                onClick={() => {
                  setLayer(l);
                  setQuery('');
                  inputRef.current?.focus();
                }}
              />
            ))}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 space-y-3 px-5 pt-5 pb-1 sm:px-6 sm:pt-6">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">{panelTitle}</h3>
                <p className="mt-1 text-[13px] text-muted">{panelDescription}</p>
              </div>

              <div className="relative">
                <svg
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle"
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  aria-hidden
                >
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar tecnología…"
                  className="w-full rounded-xl border border-border/80 bg-background py-2.5 pr-3 pl-9 text-sm text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3 sm:pb-4">
              {results.length > 0 || showCustom ? (
                <ul className="flex flex-col gap-1">
                  {results.map((tech) => {
                    const selected = selectedSet.has(tech.id);
                    return (
                      <li key={tech.id}>
                        <button
                          type="button"
                          onClick={() => toggleTech(tech)}
                          className={[
                            'flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                            selected
                              ? 'bg-elevated text-foreground'
                              : 'hover:bg-surface-hover/60',
                          ].join(' ')}
                        >
                          <StackTechIconById catalogId={tech.id} size={22} />
                          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                            {tech.name}
                          </span>
                          {(isSearching || layer === 'all') && (
                            <span className="shrink-0 text-[11px] text-subtle">
                              {layerBadge(tech)}
                            </span>
                          )}
                          {selected ? (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}

                  {showCustom ? (
                    <li className="mt-1 border-t border-border/60 pt-1">
                      <button
                        type="button"
                        onClick={() => onAddCustom(query.trim(), customTargetLayer)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover/60"
                      >
                        <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md bg-surface-muted text-subtle">
                          +
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="font-medium text-foreground">
                            Añadir «{query.trim()}»
                          </span>
                          <span className="mt-0.5 block text-[11px] text-subtle">
                            en {STACK_LAYER_LABELS[customTargetLayer]}
                          </span>
                        </span>
                      </button>
                    </li>
                  ) : null}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                  <p className="text-sm text-muted">Sin resultados</p>
                  <p className="mt-1 max-w-xs text-[13px] text-subtle">
                    Prueba otro nombre o escribe al menos 2 letras para crear una tecnología
                    personalizada.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border/60 px-5 py-3.5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-subtle">
              {selectedCatalogIds.length > 0
                ? `${selectedCatalogIds.length} en el stack`
                : 'Los cambios se guardan solos'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const TECH_CATALOG_PREVIEW = ALL_STACK_LAYERS.flatMap((layerId) =>
  getTechCatalogByLayer(layerId).slice(0, 3)
).slice(0, 36);

function LayerNavItem({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors',
        'shrink-0 sm:w-full',
        active
          ? 'bg-elevated font-medium text-foreground'
          : 'text-subtle hover:bg-surface-hover hover:text-foreground',
      ].join(' ')}
    >
      <span className={['shrink-0', active ? 'opacity-100' : 'opacity-70'].join(' ')}>{icon}</span>
      <span className="text-[13px] font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}
