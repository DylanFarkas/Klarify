/**
 * @fileoverview Modal emergente con el log de actividad del agente en tiempo real.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AgentActivityEntry } from '@/lib/types/agent-activity';
import { AgentActivityLog } from '@/components/agents/shared/activity-log/AgentActivityLog';
import { summarizeAgentActivity } from '@/lib/utils/agent-activity-summary';

const IS_DEV = process.env.NODE_ENV === 'development';
const SUCCESS_DISMISS_MS = 1400;

interface AgentActivityModalProps {
  open: boolean;
  isActive: boolean;
  title: string;
  description: string;
  entries: AgentActivityEntry[];
  meta?: string;
  onClose?: () => void;
  /** En dev: permite reabrir el modal tras finalizar */
  devReopenable?: boolean;
}

export function AgentActivityModal({
  open,
  isActive,
  title,
  description,
  entries,
  meta,
  onClose,
  devReopenable = IS_DEV,
}: AgentActivityModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const wasActiveRef = useRef(false);

  const summary = summarizeAgentActivity(entries);
  const hasContent = entries.length > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setVisible(true);
      if (isActive) setShowSuccess(false);
    } else {
      setVisible(false);
      setShowSuccess(false);
      wasActiveRef.current = false;
    }
  }, [open, isActive]);

  useEffect(() => {
    if (isActive) {
      wasActiveRef.current = true;
      setShowSuccess(false);
      return;
    }

    if (wasActiveRef.current && open && hasContent) {
      setShowSuccess(true);
      const timer = window.setTimeout(() => {
        setShowSuccess(false);
        wasActiveRef.current = false;
        if (!devReopenable) {
          setVisible(false);
          onClose?.();
        }
      }, SUCCESS_DISMISS_MS);
      return () => window.clearTimeout(timer);
    }
  }, [isActive, open, hasContent, devReopenable, onClose]);

  if (!mounted || !visible) return null;

  const progressWidth = isActive ? Math.max(summary.progressPercent, 8) : 100;
  const statusLabel = summary.runningActionLabel ?? summary.activePhaseLabel ?? description;

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-activity-modal-title"
    >
      <div
        className="absolute inset-0 animate-[fadeIn_0.2s_ease-out] bg-background/70 backdrop-blur-sm"
        aria-hidden="true"
        onClick={() => {
          if (!isActive) {
            setVisible(false);
            onClose?.();
          }
        }}
      />

      <div className="relative w-full max-w-xl animate-[modalPopIn_0.35s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="relative flex h-[min(78vh,620px)] max-h-[min(78vh,620px)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          <div className="relative shrink-0 border-b border-border px-5 py-4">
            {!isActive && (
              <button
                type="button"
                onClick={() => {
                  setVisible(false);
                  onClose?.();
                }}
                className="absolute right-3 top-3 rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
                aria-label="Cerrar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <div className="flex items-start gap-3 pr-8">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {showSuccess ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
                  <span className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-border border-t-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  id="agent-activity-modal-title"
                  className="text-[15px] font-semibold tracking-tight text-foreground"
                >
                  {showSuccess ? 'Listo' : title}
                </h2>
                {!showSuccess ? (
                  <p className="mt-0.5 truncate text-[13px] text-muted">{statusLabel}</p>
                ) : (
                  <p className="mt-0.5 text-[13px] text-muted">El agente terminó esta etapa.</p>
                )}
                {meta && !showSuccess ? (
                  <p className="mt-1 text-xs text-subtle">{meta}</p>
                ) : null}
              </div>
            </div>

            {!showSuccess ? (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-subtle">
                  <span className="truncate">{summary.activePhaseLabel ?? 'Iniciando'}</span>
                  <span className="shrink-0 tabular-nums">
                    {summary.totalActions > 0
                      ? `${summary.doneActions}/${summary.totalActions}`
                      : '…'}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-foreground/70 transition-all duration-500 ease-out"
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4">
              {hasContent ? (
                <AgentActivityLog entries={entries} variant="live" />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
                  <span className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-border border-t-foreground" />
                  <p className="text-[13px] text-muted">Conectando con el modelo…</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
