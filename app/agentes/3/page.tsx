/**
 * @fileoverview Página del Agente 3 — Priorización (scaffold).
 *
 * Shell visual alineado con el resto del workspace. Sin lógica de negocio:
 * muestra el input `Agent3Input` que el Agente 2 deja en el pipeline para
 * que otro desarrollador pueda implementar la priorización.
 */

'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Agent3Input } from '@/lib/types/workspace';
import { Agent3InputPreview } from '@/components/agents/agent-3/Agent3InputPreview';
import { EmptyPrioritizationState } from '@/components/agents/agent-3/EmptyPrioritizationState';

export default function Agent3Page() {
  const { workspace, isLoading, sessionVersion } = useWorkspace();
  const [input, setInput] = useState<Agent3Input | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isLoading || !workspace) return;

    const pipelineInput = workspace.pipeline.agent3Input;
    setInput(pipelineInput);
    setIsHydrated(true);
  }, [isLoading, workspace, sessionVersion]);

  if (isLoading || !isHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  const hasInput = input !== null && input.epics.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      {/* ── Hero Header ───────────────────────────────────────── */}
      <div className="mb-2">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            Paso 03 / 06
          </span>
          <span className="rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
            En desarrollo
          </span>
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Priorización
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          Ordena épicas e historias de usuario por valor y esfuerzo para definir
          qué entra primero en el roadmap del producto.
        </p>
      </div>

      {hasInput && input ? (
        <Agent3InputPreview input={input} />
      ) : (
        <EmptyPrioritizationState />
      )}
    </div>
  );
}