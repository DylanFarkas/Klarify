/**
 * @fileoverview Hilo compacto del razonamiento de Klark (en vivo y plegado).
 */

'use client';

import { useEffect, useRef, useState } from 'react';

export type HarnessTraceStep =
  | { id: string; kind: 'status'; text: string }
  | { id: string; kind: 'reasoning'; text: string }
  | {
      id: string;
      kind: 'tool';
      name: string;
      summary?: string;
      status: 'running' | 'done' | 'error';
    };

const TOOL_LABELS: Record<string, string> = {
  list_backlog: 'Consultar backlog',
  get_story: 'Leer ítem',
  create_story: 'Crear ítem',
  update_story: 'Actualizar ítem',
  delete_story: 'Eliminar ítem',
  create_epic: 'Crear épica',
  update_epic: 'Actualizar épica',
  delete_epic: 'Eliminar épica',
  assign_story_sprint: 'Asignar a sprint',
  create_sprint: 'Crear sprint',
  update_sprint: 'Actualizar sprint',
  start_sprint: 'Iniciar sprint',
  complete_sprint: 'Cerrar sprint',
  update_story_status: 'Cambiar estado Kanban',
  assign_story: 'Asignar responsable',
  delete_sprint: 'Eliminar sprint',
  get_stack: 'Leer stack',
  save_stack: 'Guardar stack',
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replaceAll('_', ' ');
}

function stepCopy(step: HarnessTraceStep): string {
  if (step.kind === 'status' || step.kind === 'reasoning') return step.text;
  const label = toolLabel(step.name);
  if (step.status === 'running') return label;
  if (step.summary) return `${label} — ${step.summary}`;
  return label;
}

function formatElapsed(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return `${seconds}s`;
}

interface HarnessThoughtThreadProps {
  steps: HarnessTraceStep[];
  live: boolean;
  startedAt?: number | null;
  endedAt?: number | null;
}

export function HarnessThoughtThread({
  steps,
  live,
  startedAt,
  endedAt,
}: HarnessThoughtThreadProps) {
  const [expanded, setExpanded] = useState(live);
  const reelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpanded(live);
  }, [live]);

  useEffect(() => {
    if (!live || !expanded) return;
    const el = reelRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [steps, live, expanded]);

  if (steps.length === 0) return null;

  const elapsedMs =
    startedAt != null ? (endedAt ?? (live ? Date.now() : startedAt)) - startedAt : null;
  const durationLabel = elapsedMs != null && !live ? formatElapsed(elapsedMs) : null;
  const currentId = live ? steps[steps.length - 1]?.id : null;
  const canToggle = !live;

  const headerLabel = live
    ? 'Pensando'
    : durationLabel
      ? `Pensó · ${durationLabel}`
      : 'Pensó';

  return (
    <div className={`harness-thought${live ? ' harness-thought--live' : ''}`}>
      <button
        type="button"
        className="harness-thought__header"
        onClick={() => canToggle && setExpanded((prev) => !prev)}
        disabled={!canToggle}
        aria-expanded={expanded}
        aria-label={live ? 'Klark está pensando' : expanded ? 'Ocultar razonamiento' : 'Ver razonamiento'}
      >
        {live ? <span className="harness-thought__pulse" aria-hidden /> : null}
        <span>{headerLabel}</span>
        {canToggle ? (
          <span className="harness-thought__hint">{expanded ? 'Ocultar' : 'Ver'}</span>
        ) : (
          <span className="harness-thought__dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        )}
      </button>

      {expanded ? (
        <div
          ref={reelRef}
          className="harness-thought__reel"
          aria-live={live ? 'polite' : undefined}
          aria-busy={live || undefined}
        >
          <ol className="harness-thought__list">
            {steps.map((step) => {
              const isCurrent = step.id === currentId;
              return (
                <li
                  key={step.id}
                  className={`harness-thought__step${
                    isCurrent ? ' harness-thought__step--current' : ''
                  }${step.kind === 'reasoning' ? ' harness-thought__step--reasoning' : ''}${
                    step.kind === 'tool' && step.status === 'error'
                      ? ' harness-thought__step--error'
                      : ''
                  }`}
                >
                  <span className="harness-thought__mark" aria-hidden />
                  <span className="harness-thought__copy">
                    {stepCopy(step)}
                    {isCurrent && live ? <span className="harness-thought__caret" /> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
