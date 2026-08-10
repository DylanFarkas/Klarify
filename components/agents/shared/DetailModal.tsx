'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '@/lib/utils/scroll-lock';

interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
  /** Ancho máximo del panel */
  maxWidth?: 'md' | 'lg' | 'xl';
}

const MAX_WIDTH: Record<NonNullable<DetailModalProps['maxWidth']>, string> = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export function DetailModal({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  children,
  maxWidth = 'lg',
}: DetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      return;
    }

    // Cierre externo (Cancelar, Escape, backdrop, X): open=false
    if (!visible) return;

    setClosing(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, visible]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    },
    [handleClose]
  );

  useEffect(() => {
    if (!visible) return;

    document.addEventListener('keydown', handleKeyDown);
    const unlockScroll = lockPageScroll();

    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 80);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      unlockScroll();
    };
  }, [visible, handleKeyDown]);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-200 flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        className={[
          'absolute inset-0 bg-background/70 backdrop-blur-sm',
          closing ? 'detail-modal-backdrop-out' : 'detail-modal-backdrop-in',
        ].join(' ')}
        aria-hidden="true"
        onClick={handleClose}
      />

      <div
        className={[
          'relative w-full sm:mx-auto',
          MAX_WIDTH[maxWidth],
          closing ? 'detail-modal-panel-out' : 'detail-modal-panel-in',
        ].join(' ')}
      >
        <div className="relative flex max-h-[min(92vh,820px)] flex-col overflow-hidden rounded-t-xl border border-border bg-surface sm:rounded-xl">
          <header className="relative shrink-0 border-b border-border px-4 py-3.5 sm:px-5">
            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleClose}
              className="absolute right-3 top-3 cursor-pointer rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
              aria-label="Cerrar detalles"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="pr-10">
              {eyebrow ? (
                <p className="mb-1 text-[11px] font-medium text-subtle">{eyebrow}</p>
              ) : null}
              <div className="flex flex-wrap items-baseline gap-2">
                {subtitle ? (
                  <span className="font-mono text-[11px] text-subtle">{subtitle}</span>
                ) : null}
                <h2
                  id="detail-modal-title"
                  className="text-[15px] font-semibold tracking-tight text-foreground sm:text-base"
                >
                  {title}
                </h2>
              </div>
            </div>
          </header>

          <div className="detail-modal-scroll relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
