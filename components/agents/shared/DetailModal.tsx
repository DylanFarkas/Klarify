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
      className="fixed inset-0 z-200 flex items-end justify-center p-0 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        className={[
          'absolute inset-0 bg-background/75 backdrop-blur-md',
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
        <div className="relative flex max-h-[min(92vh,820px)] flex-col overflow-hidden rounded-t-2xl border border-border/70 bg-surface shadow-2xl sm:rounded-2xl">
          <header className="relative shrink-0 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 cursor-pointer rounded-xl p-2 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong sm:right-5 sm:top-5"
              aria-label="Cerrar detalles"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="min-w-0 pr-10">
              {eyebrow ? (
                <p className="text-[11px] font-medium tracking-[0.04em] text-subtle">{eyebrow}</p>
              ) : null}
              {subtitle ? (
                <p
                  className={[
                    'font-mono text-[12px] text-muted',
                    eyebrow ? 'mt-1.5' : '',
                  ].join(' ')}
                >
                  {subtitle}
                </p>
              ) : null}
              <h2
                id="detail-modal-title"
                className={[
                  'font-semibold tracking-tight text-foreground',
                  'text-xl sm:text-2xl sm:leading-tight',
                  eyebrow || subtitle ? 'mt-1' : '',
                ].join(' ')}
              >
                {title}
              </h2>
            </div>
          </header>

          <div className="detail-modal-scroll relative min-h-0 flex-1 overflow-y-auto border-t border-border/60 px-5 py-5 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
