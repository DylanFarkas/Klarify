/**
 * @fileoverview Contenido principal del módulo Stack.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const [editing, setEditing] = useState(false);
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
    if (!editing) {
      setDraft(workspace.stack ? prepareStackForFirestore(workspace.stack) : null);
    }
  }, [workspace.stack, editing]);

  const displayStack = draft ?? (workspace.stack ? prepareStackForFirestore(workspace.stack) : null);
  const isEmpty = isStackEmpty(displayStack);

  const updateDraft = useCallback((updater: (prev: ProjectStack) => ProjectStack) => {
    setDraft((prev) => {
      const base = prev ?? workspace.stack ?? createEmptyStack();
      const next = updater(base);
      next.warnings = validateStackCompatibility(next);
      return next;
    });
  }, [workspace.stack]);

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
        setEditing(true);
      } else {
        const initial = mergeStackUpdate(undefined, {
          ...createEmptyStack(),
          status: 'saved',
          source: 'manual',
          productKind,
          architecturePattern,
        });
        setDraft(initial);
        setEditing(true);
      }
      setMetaOpen(false);
    },
    [draft, updateDraft, workspace.stack]
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

  const handleSave = useCallback(async () => {
    if (!draft) return;
    const toSave: ProjectStack = {
      ...draft,
      status: 'saved',
      updatedAt: Date.now(),
    };
    await onSaveStack(toSave);
    setDraft(toSave);
    setEditing(false);
  }, [draft, onSaveStack]);

  const handleClearStack = useCallback(async () => {
    setClearing(true);
    try {
      await notifyPromise(onClearStack(), {
        loading: 'Limpiando stack…',
        success: 'Stack eliminado',
        error: 'No se pudo limpiar el stack',
      });
      setDraft(null);
      setEditing(false);
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 animate-[fadeIn_0.3s_ease-out]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Stack tecnológico</h2>
          <p className="mt-1 text-sm text-muted">
            Arquitectura y tecnologías para implementar el backlog actual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                const base = draft ?? workspace.stack ?? createEmptyStack();
                setDraft(prepareStackForFirestore(base));
                setEditing(true);
              }}
              className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
            >
              Editar
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleRecommend}
            className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
          >
            Preguntar a Klark
          </button>
          {!editing ? (
            <button
              type="button"
              onClick={() => setClearConfirmOpen(true)}
              className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger cursor-pointer"
            >
              Limpiar stack
            </button>
          ) : null}
        </div>
      </header>

      {displayStack ? (
        <StackBoard
          stack={displayStack}
          editing={editing}
          onEditMeta={() => setMetaOpen(true)}
          onAddToLayer={(layer) => {
            setPickerLayer(layer);
            setPickerOpen(true);
          }}
          onRemoveItem={(layer, index) => {
            updateDraft((prev) => {
              const items = [...(prev.layers[layer] ?? [])];
              items.splice(index, 1);
              return { ...prev, layers: { ...prev.layers, [layer]: items } };
            });
          }}
        />
      ) : null}

      {editing ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => {
              setPickerLayer('frontend');
              setPickerOpen(true);
            }}
            className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer"
          >
            + Añadir tecnología
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 cursor-pointer"
          >
            Guardar stack
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(workspace.stack ?? null);
              setEditing(false);
            }}
            className="rounded-lg px-3.5 py-2 text-sm text-muted hover:text-foreground cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {conflictPrompt ? (
        <div className="fixed inset-0 z-95 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">{conflictPrompt.message}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  addCatalogItem(conflictPrompt.catalogId, conflictPrompt.layer, true);
                  setConflictPrompt(null);
                }}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
              >
                Reemplazar
              </button>
              <button
                type="button"
                onClick={() => {
                  addCatalogItem(conflictPrompt.catalogId, conflictPrompt.layer, false);
                  setConflictPrompt(null);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-surface-hover"
              >
                Mantener ambos
              </button>
              <button
                type="button"
                onClick={() => setConflictPrompt(null)}
                className="text-sm text-subtle hover:text-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {clearConfirmOpen ? (
        <div className="fixed inset-0 z-95 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5">
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
        </div>
      ) : null}
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
        onSelect={(id, layer) => tryAddCatalog(id, layer)}
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
