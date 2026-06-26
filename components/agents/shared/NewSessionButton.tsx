'use client';

/**
 * @fileoverview NewSessionButton — Inicia una sesión/proyecto nueva en el workspace.
 *
 * Muestra un diálogo de confirmación antes de borrar todo el progreso del pipeline
 * (agentes 1 y 2 + datos intermedios) en Firestore.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspace } from '@/hooks/useWorkspace';

interface NewSessionButtonProps {
  className?: string;
}

export function NewSessionButton({ className = '' }: NewSessionButtonProps) {
  const { resetSession } = useWorkspace();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    if (!isResetting) setShowConfirm(false);
  }, [isResetting]);

  useEffect(() => {
    if (!showConfirm) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [showConfirm, handleClose]);

  const handleConfirm = async () => {
    setIsResetting(true);
    try {
      await resetSession();
      setShowConfirm(false);
    } catch {
      /* el usuario puede reintentar */
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className={[
          'flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium',
          'text-muted transition-colors hover:bg-surface-hover hover:text-foreground',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
          />
        </svg>
        <span className="flex-1 text-left">Nueva sesión</span>
      </button>

      {showConfirm &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-100 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <button
              type="button"
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
              onClick={handleClose}
              aria-label="Cerrar diálogo"
            />

            <div
              role="alertdialog"
              aria-labelledby="new-session-title"
              aria-describedby="new-session-desc"
              className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-surface p-6 shadow-xl sm:rounded-2xl"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                <svg
                  className="h-5 w-5 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>

              <h2 id="new-session-title" className="text-lg font-bold text-foreground">
                ¿Iniciar una nueva sesión?
              </h2>
              <p id="new-session-desc" className="mt-2 text-sm leading-relaxed text-muted">
                Se eliminará todo lo generado anteriormente: transcripciones, deseos, backlog y
                aprobaciones. En esta fase MVP solo puedes trabajar en un proyecto a la vez. Esta
                acción no se puede deshacer.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isResetting}
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={isResetting}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? 'Reiniciando…' : 'Sí, iniciar nueva sesión'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
