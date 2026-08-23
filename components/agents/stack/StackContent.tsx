/**
 * @fileoverview Contenido principal del módulo Stack.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  KLARK_STACK_RECOMMEND_PROMPT,
  useKlarkControl,
} from '@/context/KlarkControlContext';
import { StackBoard } from '@/components/agents/stack/StackBoard';
import { StackEmptyState } from '@/components/agents/stack/StackEmptyState';
import { StackMetaModal } from '@/components/agents/stack/StackMetaModal';
import { StackTechPicker } from '@/components/agents/stack/StackTechPicker';
import { getTechById } from '@/lib/constants/tech-catalog';
import {
  findAddConflict,
  getImpliedItems,
  validateStackCompatibility,
} from '@/lib/stack/compatibility';
import { mergeStackUpdate, isStackEmpty, prepareStackForFirestore } from '@/lib/stack/normalize';
import { notifyPromise } from '@/lib/notifications/toast';
import type { ProjectStack, StackLayerId } from '@/lib/types/stack';
import { createEmptyStack, PRIMARY_STACK_LAYERS } from '@/lib/types/stack';
import type { UserWorkspace } from '@/lib/types/workspace';

function countStackTechnologies(stack: ProjectStack): number {
  return Object.values(stack.layers).reduce((sum, items) => sum + (items?.length ?? 0), 0);
}

function stackSourceLabel(source: ProjectStack['source']): string {
  if (source === 'ai') return 'Recomendado por Klark';
  if (source === 'mixed') return 'Mixto';
  return 'Armado manualmente';
}

const STACK_SAVE_DEBOUNCE_MS = 500;

interface StackContentProps {
  workspace: UserWorkspace;
  pipelineReady: boolean;
  onSaveStack: (stack: ProjectStack) => Promise<void>;
  onClearStack: () => Promise<void>;
}

export function StackContent({
  workspace,
  pipelineReady,
  onSaveStack,
  onClearStack,
}: StackContentProps) {
  const { openKlarkWithMessage } = useKlarkControl();

  const [draft, setDraft] = useState<ProjectStack | null>(workspace.stack ?? null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLayer, setPickerLayer] = useState<StackLayerId>('frontend');
  const [metaOpen, setMetaOpen] = useState(false);
  const [conflictPrompt, setConflictPrompt] = useState<{
    catalogId: string;
    layer: StackLayerId;
    conflictId: string;
    message: string;
  } | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setDraft(workspace.stack ? prepareStackForFirestore(workspace.stack) : null);
    }
  }, [workspace.stack, isDirty]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const persistDraft = useCallback(
    async (stack: ProjectStack) => {
      setSaving(true);
      try {
        await onSaveStack({
          ...stack,
          status: 'saved',
          updatedAt: Date.now(),
        });
        if (!saveTimerRef.current) {
          setIsDirty(false);
        }
      } finally {
        setSaving(false);
      }
    },
    [onSaveStack]
  );

  const scheduleSave = useCallback(
    (stack: ProjectStack) => {
      setIsDirty(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void persistDraft(stack);
      }, STACK_SAVE_DEBOUNCE_MS);
    },
    [persistDraft]
  );

  const displayStack = draft ?? (workspace.stack ? prepareStackForFirestore(workspace.stack) : null);
  const isEmpty = isStackEmpty(displayStack);

  const updateDraft = useCallback((updater: (prev: ProjectStack) => ProjectStack) => {
    setDraft((prev) => {
      const base = prev ?? workspace.stack ?? createEmptyStack();
      const next = updater(base);
      next.warnings = validateStackCompatibility(next);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, workspace.stack]);

  const startManual = useCallback(() => {
    setMetaOpen(true);
  }, []);

  const applyMeta = useCallback(
    (productKind: string, architecturePattern: string) => {
      if (draft || workspace.stack) {
        updateDraft((prev) => ({
          ...prev,
          productKind,
          architecturePattern,
        }));
      } else {
        const initial = mergeStackUpdate(undefined, {
          ...createEmptyStack(),
          status: 'saved',
          source: 'manual',
          productKind,
          architecturePattern,
        });
        initial.warnings = validateStackCompatibility(initial);
        setDraft(initial);
        scheduleSave(initial);
      }
      setMetaOpen(false);
    },
    [draft, scheduleSave, updateDraft, workspace.stack]
  );

  const addCatalogItem = useCallback(
    (catalogId: string, layer: StackLayerId, replacePrimary?: boolean) => {
      const tech = getTechById(catalogId);
      if (!tech) return;

      updateDraft((prev) => {
        const layers = { ...prev.layers };
        let items = [...(layers[layer] ?? [])];

        if (replacePrimary && PRIMARY_STACK_LAYERS.includes(layer)) {
          items = items.filter((i) => !i.isPrimary);
        }

        const isPrimary =
          tech.primaryEligible && PRIMARY_STACK_LAYERS.includes(layer) && !items.some((i) => i.isPrimary);

        if (!items.some((i) => i.catalogId === catalogId)) {
          items.push({ catalogId, isPrimary });
        }

        for (const implied of getImpliedItems(catalogId)) {
          const impTech = implied.catalogId ? getTechById(implied.catalogId) : undefined;
          if (!impTech) continue;
          const impLayer = impTech.layer;
          const impList = [...(layers[impLayer] ?? [])];
          if (!impList.some((i) => i.catalogId === implied.catalogId)) {
            impList.push(implied);
            layers[impLayer] = impList;
          }
        }

        layers[layer] = items;
        return { ...prev, layers, source: prev.source === 'ai' ? 'mixed' : 'manual' };
      });
    },
    [updateDraft]
  );

  const tryAddCatalog = useCallback(
    (catalogId: string, layer: StackLayerId) => {
      const prev = draft ?? workspace.stack ?? createEmptyStack();
      const conflict = findAddConflict(prev, catalogId, layer);
      if (conflict) {
        setConflictPrompt({ catalogId, layer, conflictId: conflict.conflictId, message: conflict.message });
        return;
      }
      addCatalogItem(catalogId, layer);
    },
    [addCatalogItem, draft, workspace.stack]
  );

  const handleRecommend = useCallback(() => {
    openKlarkWithMessage(KLARK_STACK_RECOMMEND_PROMPT);
  }, [openKlarkWithMessage]);

  const handleClearStack = useCallback(async () => {
    setClearing(true);
    try {
      await notifyPromise(onClearStack(), {
        loading: 'Limpiando stack…',
        success: 'Stack eliminado',
        error: 'No se pudo limpiar el stack',
      });
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      setDraft(null);
      setIsDirty(false);
      setClearConfirmOpen(false);
    } finally {
      setClearing(false);
    }
  }, [onClearStack]);

  const mainContent =
    !pipelineReady || isEmpty ? (
      <StackEmptyState
        pipelineReady={pipelineReady}
        onBuildManual={startManual}
        onRecommend={handleRecommend}
      />
    ) : (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-7 animate-[fadeIn_0.3s_ease-out]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Stack tecnológico
          </h1>
          <p className="text-sm text-muted">
            Arquitectura y tecnologías para implementar el backlog actual.
          </p>
          {displayStack ? (
            <p className="text-[12px] tabular-nums text-subtle">
              {countStackTechnologies(displayStack)} tecnologías
              {' · '}
              {stackSourceLabel(displayStack.source)}
              {saving ? (
                <>
                  {' · '}
                  Guardando…
                </>
              ) : null}
              {displayStack.warnings && displayStack.warnings.length > 0 ? (
                <>
                  {' · '}
                  {displayStack.warnings.length} aviso
                  {displayStack.warnings.length !== 1 ? 's' : ''}
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPickerLayer('frontend');
              setPickerOpen(true);
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
          >
            Añadir tecnología
          </button>
          <button
            type="button"
            onClick={handleRecommend}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
          >
            Preguntar a Klark
          </button>
          <button
            type="button"
            onClick={() => setClearConfirmOpen(true)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-danger cursor-pointer"
          >
            Limpiar
          </button>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        {displayStack ? (
          <StackBoard
            stack={displayStack}
            editing
            onEditMeta={() => setMetaOpen(true)}
            onRemoveItem={(layer, index) => {
              updateDraft((prev) => {
                const items = [...(prev.layers[layer] ?? [])];
                items.splice(index, 1);
                return { ...prev, layers: { ...prev.layers, [layer]: items } };
              });
            }}
          />
        ) : null}
      </section>

      {conflictPrompt
        ? createPortal(
            <div className="fixed inset-0 z-110 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl">
                <p className="text-sm leading-relaxed text-muted">{conflictPrompt.message}</p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      addCatalogItem(conflictPrompt.catalogId, conflictPrompt.layer, true);
                      setConflictPrompt(null);
                    }}
                    className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 cursor-pointer"
                  >
                    Reemplazar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addCatalogItem(conflictPrompt.catalogId, conflictPrompt.layer, false);
                      setConflictPrompt(null);
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-surface-hover cursor-pointer"
                  >
                    Mantener ambos
                  </button>
                  <button
                    type="button"
                    onClick={() => setConflictPrompt(null)}
                    className="text-sm text-subtle hover:text-muted cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {clearConfirmOpen
        ? createPortal(
            <div className="fixed inset-0 z-110 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl">
                <h3 className="text-[15px] font-semibold text-foreground">¿Limpiar el stack?</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Se borrará el stack guardado de este proyecto. Podrás pedírselo de nuevo a Klark o
                  armarlo manualmente desde cero.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void handleClearStack()}
                    disabled={clearing}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    {clearing ? 'Limpiando…' : 'Sí, limpiar stack'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearConfirmOpen(false)}
                    disabled={clearing}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-surface-hover disabled:opacity-40 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
    );

  return (
    <>
      {mainContent}

      <StackMetaModal
        open={metaOpen}
        productKind={displayStack?.productKind ?? ''}
        architecturePattern={displayStack?.architecturePattern ?? ''}
        onClose={() => setMetaOpen(false)}
        onApply={applyMeta}
      />

      <StackTechPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialLayer={pickerLayer}
        selectedCatalogIds={
          displayStack
            ? Object.values(displayStack.layers)
                .flat()
                .map((item) => item.catalogId)
                .filter((id): id is string => Boolean(id))
            : []
        }
        onSelect={(id, layer) => tryAddCatalog(id, layer)}
        onDeselect={(catalogId) => {
          updateDraft((prev) => {
            const layers = { ...prev.layers };
            for (const layerId of Object.keys(layers) as StackLayerId[]) {
              const items = layers[layerId];
              if (!items?.length) continue;
              const next = items.filter((i) => i.catalogId !== catalogId);
              if (next.length !== items.length) {
                layers[layerId] = next;
              }
            }
            return { ...prev, layers };
          });
        }}
        onAddCustom={(name, layer) => {
          updateDraft((prev) => {
            const items = [...(prev.layers[layer] ?? []), { customName: name, isPrimary: false }];
            return {
              ...prev,
              layers: { ...prev.layers, [layer]: items },
              source: prev.source === 'ai' ? 'mixed' : 'manual',
            };
          });
        }}
      />
    </>
  );
}
