'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '@/lib/utils/scroll-lock';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` para acciones destructivas (rojo). Default: `danger`. */
  variant?: 'danger' | 'primary';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Provider que expone `useConfirm()` — API async tipo `window.confirm`
 * con UI alineada a los tokens del workspace.
 */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setClosing(false);
      setPending({ ...options, resolve });
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    setClosing(true);
    window.setTimeout(() => {
      setPending((current) => {
        current?.resolve(value);
        return null;
      });
      setClosing(false);
    }, 180);
  }, []);

  useEffect(() => {
    if (!pending) return;

    const unlockScroll = lockPageScroll();
    const focusTimer = window.setTimeout(() => confirmBtnRef.current?.focus(), 60);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    };
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      unlockScroll();
    };
  }, [pending, finish]);

  const variant = pending?.variant ?? 'danger';
  const confirmLabel = pending?.confirmLabel ?? 'Eliminar';
  const cancelLabel = pending?.cancelLabel ?? 'Cancelar';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {mounted &&
        pending &&
        createPortal(
          <div
            className="fixed inset-0 z-300 flex items-end justify-center p-0 sm:items-center sm:p-6"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby={pending.description ? 'confirm-dialog-desc' : undefined}
          >
            <div
              className={[
                'absolute inset-0 bg-background/70 backdrop-blur-md',
                closing ? 'detail-modal-backdrop-out' : 'detail-modal-backdrop-in',
              ].join(' ')}
              aria-hidden="true"
              onClick={() => finish(false)}
            />

            <div
              className={[
                'relative w-full max-w-md sm:mx-auto',
                closing ? 'detail-modal-panel-out' : 'detail-modal-panel-in',
              ].join(' ')}
            >
              <div className="relative overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl">
                <div className="border-b border-border/60 px-5 py-4 sm:px-6">
                  <h2
                    id="confirm-dialog-title"
                    className="text-base font-bold text-foreground sm:text-lg"
                  >
                    {pending.title}
                  </h2>
                  {pending.description && (
                    <p
                      id="confirm-dialog-desc"
                      className="mt-2 text-sm leading-relaxed text-muted"
                    >
                      {pending.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={() => finish(false)}
                    className={[
                      'rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground cursor-pointer',
                      'transition-colors hover:bg-surface-hover',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    ].join(' ')}
                  >
                    {cancelLabel}
                  </button>
                  <button
                    ref={confirmBtnRef}
                    type="button"
                    onClick={() => finish(true)}
                    className={[
                      'rounded-lg px-4 py-2 text-sm font-semibold text-white cursor-pointer',
                      'transition-colors focus-visible:outline-none focus-visible:ring-2',
                      variant === 'danger'
                        ? 'bg-red-600 hover:bg-red-500 focus-visible:ring-red-500/40 cursor-pointer'
                        : 'bg-primary hover:bg-primary-hover focus-visible:ring-primary/40 cursor-pointer',
                    ].join(' ')}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

/** Devuelve `true` si el usuario confirma. Debe usarse dentro de `ConfirmDialogProvider`. */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm debe usarse dentro de ConfirmDialogProvider');
  }
  return confirm;
}
