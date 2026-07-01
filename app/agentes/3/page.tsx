/**
 * @fileoverview Página del Agente 3 — Estimación en Story Points (scaffold).
 *
 * Shell visual alineado con el resto del workspace. Sin lógica de negocio:
 * documenta el alcance mínimo del agente y muestra el input `Agent3Input` del pipeline.
 */

'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Agent3Input } from '@/lib/types/workspace';
import { EmptyPrioritizationState } from '@/components/agents/agent-3/EmptyPrioritizationState';
import { EstimationWorkspace } from '@/components/agents/agent-3/EstimationWorkspace';

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

  useEffect(() => {
    if (!isLoading && workspace) {
      console.log('=== [DEBUG AGENTE 3] Objeto Workspace Completo ===');
      console.log(workspace);
      console.log('=== [DEBUG AGENTE 3] Pipeline Input (Agent 3) ===');
      console.log(workspace.pipeline?.agent3Input);
    }
  }, [workspace, isLoading]);

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
          {/*<span className="rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
            En desarrollo
          </span>*/}
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Estimación en Story Points
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          Como Scrum Master, el agente sugiere una estimación en Story Points para
          cada historia de usuario del backlog aprobado, basándose en su complejidad
          técnica. El equipo revisa y ajusta antes de consolidar.
        </p>
      </div>

      {/* ── Área de Trabajo Principal (HITL Integration) ──────── */}
      {hasInput && input ? (
        <EstimationWorkspace 
          input={input} 
        />
      ) : (
        <EmptyPrioritizationState />
      )}
      
      {/*Área de Trabajo Principal (HITL Integration) 
      {hasInput && input ? (
        <Agent3InputPreview input={input} />
      ) : (
        <EmptyPrioritizationState />
      )}*/}
    </div>
  );
}
