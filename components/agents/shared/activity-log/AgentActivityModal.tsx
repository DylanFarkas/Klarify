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

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-activity-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-[fadeIn_0.25s_ease-out] bg-background/75 backdrop-blur-md"
        aria-hidden="true"
        onClick={() => {
          if (!isActive) {
            setVisible(false);
            onClose?.();
          }
        }}
      />

      {/* Animated gradient border wrapper */}
      <div className="agent-modal-shell relative w-full max-w-2xl animate-[modalPopIn_0.4s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="relative flex h-[min(80vh,680px)] max-h-[min(80vh,680px)] flex-col overflow-hidden rounded-2xl bg-surface shadow-xl">
          {/* Ambient glow — más sutil */}
          <div
            className="pointer-events-none absolute -top-24 left-1/2 h-40 w-[70%] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />

          {/* Header */}
          <div className="relative shrink-0 border-b border-border/60 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              {!isActive && (
                <button
                  type="button"
                  onClick={() => {
                    setVisible(false);
                    onClose?.();
                  }}
                  className="absolute right-0 top-0 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  aria-label="Cerrar"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                {showSuccess ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
                )}
              </div>

              <div className="min-w-0 flex-1 pr-8">
                <h2 id="agent-activity-modal-title" className="text-base font-semibold text-foreground sm:text-lg">
                  {showSuccess ? '¡Listo!' : title}
                </h2>
                {!showSuccess && (
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {summary.runningActionLabel ?? summary.activePhaseLabel ?? description}
                  </p>
                )}
                {meta && !showSuccess && (
                  <p className="mt-1.5 text-[11px] text-muted">{meta}</p>
                )}
              </div>
            </div>

            {!showSuccess && (
              <div className="mt-3.5">
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted">
                  <span>{summary.activePhaseLabel ?? 'Iniciando'}</span>
                  <span className="tabular-nums">
                    {summary.totalActions > 0
                      ? `${summary.doneActions}/${summary.totalActions}`
                      : '…'}
                  </span>
                </div>
                <div className="relative h-1 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Feed */}
          <div className="agent-feed relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4 sm:px-6">
              {hasContent ? (
                <AgentActivityLog entries={entries} variant="live" />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
                  <p className="text-sm text-muted">Conectando con el modelo…</p>
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

/*
 * Botón flotante para reabrir el log en desarrollo (desactivado).
 *
 * export function AgentActivityModalDevTrigger({
 *   entries,
 *   onOpen,
 * }: {
 *   entries: AgentActivityEntry[];
 *   onOpen: () => void;
 * }) {
 *   if (!IS_DEV || entries.length === 0) return null;
 *
 *   return (
 *     <button
 *       type="button"
 *       onClick={onOpen}
 *       className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border/80 bg-surface/95 px-4 py-2.5 text-xs font-medium text-muted shadow-lg backdrop-blur-sm transition-all hover:border-primary/40 hover:text-foreground"
 *     >
 *       <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
 *         Dev
 *       </span>
 *       Ver log del agente
 *     </button>
 *   );
 * }
 */
