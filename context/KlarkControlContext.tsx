/**
 * @fileoverview Control programático de Klark (abrir panel y enviar mensajes).
 */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from 'react';

export const KLARK_STACK_RECOMMEND_PROMPT =
  'Recomienda el stack tecnológico ideal para este proyecto según el backlog y el contexto del Agente 1. Incluye solo las capas que el producto realmente necesita (no añadas realtime, pagos, CMS u otras capas especializadas sin evidencia en el backlog). Justifica tu elección y guárdalo con save_stack (se persiste de inmediato).';

interface KlarkHandlers {
  open: () => void;
  send: (message: string) => void;
  canSend: () => boolean;
}

interface KlarkControlValue {
  openKlarkWithMessage: (message: string) => void;
  registerKlark: (handlers: KlarkHandlers) => void;
  unregisterKlark: () => void;
  notifyKlarkReady: () => void;
}

const KlarkControlContext = createContext<KlarkControlValue | null>(null);

export function KlarkControlProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<KlarkHandlers | null>(null);
  const pendingMessageRef = useRef<string | null>(null);

  const flushPending = useCallback((handlers: KlarkHandlers) => {
    const pending = pendingMessageRef.current;
    if (!pending) return;
    pendingMessageRef.current = null;
    handlers.open();
    window.setTimeout(() => {
      if (handlers.canSend()) {
        handlers.send(pending);
      }
    }, 80);
  }, []);

  const registerKlark = useCallback(
    (handlers: KlarkHandlers) => {
      handlersRef.current = handlers;
      flushPending(handlers);
    },
    [flushPending]
  );

  const unregisterKlark = useCallback(() => {
    handlersRef.current = null;
  }, []);

  const openKlarkWithMessage = useCallback((message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const handlers = handlersRef.current;
    if (handlers?.canSend()) {
      handlers.open();
      window.setTimeout(() => handlers.send(trimmed), 80);
      return;
    }

    pendingMessageRef.current = trimmed;
    handlers?.open();
  }, []);

  const notifyKlarkReady = useCallback(() => {
    const handlers = handlersRef.current;
    if (handlers) flushPending(handlers);
  }, [flushPending]);

  return (
    <KlarkControlContext.Provider
      value={{ openKlarkWithMessage, registerKlark, unregisterKlark, notifyKlarkReady }}
    >
      {children}
    </KlarkControlContext.Provider>
  );
}

export function useKlarkControl(): KlarkControlValue {
  const ctx = useContext(KlarkControlContext);
  if (!ctx) {
    throw new Error('useKlarkControl debe usarse dentro de KlarkControlProvider');
  }
  return ctx;
}

export function useKlarkControlOptional(): KlarkControlValue | null {
  return useContext(KlarkControlContext);
}
