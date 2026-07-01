/**
 * @fileoverview Página del Agente 4 — Priorización (scaffold).
 *
 * Muestra el contrato `Agent4Input` recibido del Agente 3 vía pipeline.
 */

'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Agent4Input } from '@/lib/types/workspace';
import { EmptyAgent4State } from '@/components/agents/agent-4/EmptyAgent4State';
import { Agent4InputPreview } from '@/components/agents/agent-4/Agent4InputPreview';

export default function Agent4Page() {
  const { workspace, isLoading, sessionVersion } = useWorkspace();
  const [input, setInput] = useState<Agent4Input | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isLoading || !workspace) return;

    const pipelineInput = workspace.pipeline.agent4Input;
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
      <div className="mb-2">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            Paso 04 / 06
          </span>
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Priorización del Backlog
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          Con el backlog estimado del Agente 3, este paso ordenará épicas e historias
          según valor de negocio y esfuerzo. Por ahora se muestra el contrato de datos
          recibido para validar la integración del pipeline.
        </p>
      </div>

      {hasInput && input ? (
        <Agent4InputPreview input={input} />
      ) : (
        <EmptyAgent4State />
      )}
    </div>
  );
}
