/**
 * @fileoverview Panel de chat de Klark (asistente de backlog).
 */

'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { authFetch } from '@/lib/api-client';
import type {
  HarnessChatMessage,
  HarnessConfirmedAction,
  HarnessStreamEvent,
} from '@/lib/harness/types';
import { notifySuccess, notifyError } from '@/lib/notifications/toast';
import { LLM_STREAM_CONTENT_TYPE } from '@/lib/utils/llm-stream';
import { ThoughtMarkdown } from '@/components/agents/shared/activity-log/AgentActivityLog/ThoughtMarkdown';
import {
  HarnessThoughtThread,
  type HarnessTraceStep,
} from '@/components/agents/harness/HarnessThoughtThread';

interface PendingConfirm {
  name: string;
  args: Record<string, unknown>;
  label: string;
}

interface HarnessChatPanelProps {
  enabled: boolean;
  remainingMessages: number | null | undefined;
  onWorkspaceMutated: () => Promise<void>;
  onClose?: () => void;
}

/** Ejemplos de capacidades (no ejecutables; el prompt real lo escribe el usuario). */
const EXAMPLES = [
  {
    label: 'Consultar el backlog',
    example: '«Muéstrame las épicas y sus historias»',
    hint: 'Lectura',
  },
  {
    label: 'Crear o editar historias',
    example: '«Crea una HU para…» o «Actualiza el título de…»',
    hint: 'Historias',
  },
  {
    label: 'Gestionar épicas y sprints',
    example: '«Inicia el sprint 1» o «Cierra el sprint y mueve incompletas al backlog»',
    hint: 'Organización',
  },
  {
    label: 'Ejecución',
    example: '«Pasa HU-012 a in progress» o «Asigna esa historia a Ana»',
    hint: 'Kanban',
  },
  {
    label: 'Priorizar',
    example: '«Prioriza esta historia con el framework del proyecto»',
    hint: 'Prioridad',
  },
] as const;

function formatTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat('es', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
}

function isToolEchoThought(text: string): boolean {
  return /^Ejecutando\s+\S+/i.test(text.trim());
}

/** Detecta respuestas afirmativas cortas para confirmar acciones pendientes. */
function isAffirmativeConfirm(message: string): boolean {
  const normalized = message
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return /^(si|sip|sep|ok|okay|dale|confirmo|confirma|confirmado|yes|y|vale|claro|adelante|hazlo|elimina(la|lo)?|borra(la|lo)?)[!?.]*$/i.test(
    normalized
  );
}

export function HarnessChatPanel({
  enabled,
  remainingMessages,
  onWorkspaceMutated,
  onClose,
}: HarnessChatPanelProps) {
  const { user } = useAuth();
  const { activeProjectId } = useWorkspace();
  const [messages, setMessages] = useState<HarnessChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [trace, setTrace] = useState<HarnessTraceStep[]>([]);
  const [traceLive, setTraceLive] = useState(false);
  const [traceStartedAt, setTraceStartedAt] = useState<number | null>(null);
  const [traceEndedAt, setTraceEndedAt] = useState<number | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const traceIdRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null | undefined>(remainingMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const workspaceDirty = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadedForProjectRef = useRef<string | null>(null);

  useEffect(() => {
    setRemaining(remainingMessages);
  }, [remainingMessages]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
  }, [messages, trace, traceLive, pendingConfirm]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [input]);

  useEffect(() => {
    if (loadedForProjectRef.current && loadedForProjectRef.current !== activeProjectId) {
      loadedForProjectRef.current = null;
      setMessages([]);
      setTrace([]);
      setTraceLive(false);
      setTraceStartedAt(null);
      setTraceEndedAt(null);
      setPendingConfirm(null);
      setError(null);
      setConfirmClear(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (!user || !enabled || !activeProjectId) return;
    if (loadedForProjectRef.current === activeProjectId) return;

    let cancelled = false;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      setError(null);
      try {
        const url = `/api/harness/chat?projectId=${encodeURIComponent(activeProjectId)}`;
        const response = await authFetch(url, user);
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? 'No se pudo cargar el historial');
        }
        const data = (await response.json()) as { messages: HarnessChatMessage[] };
        if (cancelled) return;
        setMessages(data.messages ?? []);
        loadedForProjectRef.current = activeProjectId;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar el historial');
        }
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    };

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [user, enabled, activeProjectId]);

  const consumeStream = useCallback(
    async (response: Response) => {
      if (!response.body) {
        throw new Error('La respuesta no incluye stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      workspaceDirty.current = false;

      const nextStepId = () => {
        traceIdRef.current += 1;
        return `trace-${traceIdRef.current}`;
      };

      const completeTrace = () => {
        setTraceLive(false);
        setTraceEndedAt(Date.now());
      };

      const handleEvent = async (event: HarnessStreamEvent) => {
        switch (event.type) {
          case 'thought': {
            if (event.delta) {
              if (!event.text) break;
              setTrace((prev) => {
                const withoutStatus = prev.filter((step) => step.kind !== 'status');
                const last = withoutStatus[withoutStatus.length - 1];
                if (last?.kind === 'reasoning') {
                  return [
                    ...withoutStatus.slice(0, -1),
                    { ...last, text: last.text + event.text },
                  ];
                }
                return [
                  ...withoutStatus,
                  { id: nextStepId(), kind: 'reasoning', text: event.text },
                ];
              });
              break;
            }
            const text = event.text.trim();
            if (!text || isToolEchoThought(text)) break;
            setTrace((prev) => {
              if (prev.some((step) => step.kind === 'status' && step.text === text)) {
                return prev;
              }
              return [...prev, { id: nextStepId(), kind: 'status', text }];
            });
            break;
          }
          case 'tool_start':
            setTrace((prev) => [
              ...prev,
              {
                id: nextStepId(),
                kind: 'tool',
                name: event.name,
                status: 'running',
              },
            ]);
            break;
          case 'tool_end':
            setTrace((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i -= 1) {
                const step = next[i];
                if (step.kind === 'tool' && step.name === event.name && step.status === 'running') {
                  next[i] = {
                    ...step,
                    status: event.ok ? 'done' : 'error',
                    summary: event.summary,
                  };
                  break;
                }
              }
              return next;
            });
            break;
          case 'confirm':
            setPendingConfirm({
              name: event.name,
              args: event.args,
              label: event.label,
            });
            completeTrace();
            break;
          case 'message':
            completeTrace();
            setMessages((prev) => [
              ...prev,
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: event.text,
                createdAt: Date.now(),
              },
            ]);
            break;
          case 'workspace_updated':
            workspaceDirty.current = true;
            break;
          case 'done':
            setMessages(event.payload.messages);
            setRemaining(event.payload.remaining);
            completeTrace();
            break;
          case 'error':
            completeTrace();
            throw new Error(event.error);
          default:
            break;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          await handleEvent(JSON.parse(trimmed) as HarnessStreamEvent);
        }
      }

      if (buffer.trim()) {
        await handleEvent(JSON.parse(buffer.trim()) as HarnessStreamEvent);
      }

      if (workspaceDirty.current) {
        await onWorkspaceMutated();
      }
    },
    [onWorkspaceMutated]
  );

  const sendTurn = useCallback(
    async (message: string, confirmedAction?: HarnessConfirmedAction) => {
      if (!user || isSending) return;
      const trimmed = message.trim();
      if (!trimmed && !confirmedAction) return;

      setIsSending(true);
      setError(null);
      traceIdRef.current = 0;
      setTrace([{ id: 'trace-0', kind: 'status', text: 'Analizando petición…' }]);
      setTraceLive(true);
      setTraceStartedAt(Date.now());
      setTraceEndedAt(null);
      setConfirmClear(false);
      if (!confirmedAction) {
        setPendingConfirm(null);
      }

      if (trimmed) {
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
            createdAt: Date.now(),
          },
        ]);
        setInput('');
      }

      try {
        const response = await authFetch('/api/harness/chat', user, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed || 'Confirmado',
            ...(confirmedAction ? { confirmedAction } : {}),
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? 'No se pudo enviar el mensaje');
        }

        const contentType = response.headers.get('Content-Type') ?? '';
        if (!contentType.includes(LLM_STREAM_CONTENT_TYPE) && !contentType.includes('ndjson')) {
          throw new Error('Respuesta inesperada de Klark');
        }

        await consumeStream(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error en Klark');
        setTraceLive(false);
        setTraceEndedAt((prev) => prev ?? Date.now());
      } finally {
        setIsSending(false);
      }
    },
    [user, isSending, consumeStream]
  );

  const clearChat = useCallback(async () => {
    if (!user || isClearing || isSending) return;
    setIsClearing(true);
    setError(null);
    try {
      const url = activeProjectId
        ? `/api/harness/chat?projectId=${encodeURIComponent(activeProjectId)}`
        : '/api/harness/chat';
      const response = await authFetch(url, user, { method: 'DELETE' });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'No se pudo limpiar el chat');
      }
      setMessages([]);
      setTrace([]);
      setTraceLive(false);
      setTraceStartedAt(null);
      setTraceEndedAt(null);
      setPendingConfirm(null);
      setConfirmClear(false);
      notifySuccess('Chat limpiado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al limpiar el chat';
      setError(message);
      notifyError(message);
    } finally {
      setIsClearing(false);
    }
  }, [user, isClearing, isSending, activeProjectId]);

  const sendWithOptionalConfirm = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (pendingConfirm && isAffirmativeConfirm(trimmed)) {
        const action = {
          name: pendingConfirm.name,
          args: pendingConfirm.args,
        };
        setPendingConfirm(null);
        void sendTurn(trimmed || `Confirmado: ${pendingConfirm.label}`, action);
        return;
      }
      void sendTurn(trimmed);
    },
    [pendingConfirm, sendTurn]
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    sendWithOptionalConfirm(input);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendWithOptionalConfirm(input);
    }
  };

  const handleConfirm = () => {
    if (!pendingConfirm) return;
    const action = {
      name: pendingConfirm.name,
      args: pendingConfirm.args,
    };
    setPendingConfirm(null);
    void sendTurn(`Confirmado: ${pendingConfirm.label}`, action);
  };

  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {enabled && confirmClear ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/25 px-2.5 py-1.5">
          <span className="text-xs font-medium text-foreground">¿Limpiar?</span>
          <button
            type="button"
            onClick={() => void clearChat()}
            disabled={isClearing}
            className="cursor-pointer rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isClearing ? '…' : 'Sí'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmClear(false)}
            disabled={isClearing}
            className="cursor-pointer rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
          >
            No
          </button>
        </div>
      ) : enabled ? (
        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          disabled={isSending || isClearing || messages.length === 0}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          title="Limpiar conversación"
        >
          <TrashIcon />
          <span className="hidden sm:inline">Limpiar</span>
        </button>
      ) : null}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label="Cerrar Klark"
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );

  if (!enabled) {
    return (
      <section className="harness-chat harness-chat--drawer harness-chat--locked" aria-label="Klark">
        <header className="harness-chat__header">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-subtle">
              <LockIcon />
              Bloqueado
            </span>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
              <span className="text-primary">K</span>lark
            </h2>
          </div>
          {headerActions}
        </header>
        <div className="harness-chat__body justify-center">
          <p className="text-sm leading-relaxed text-muted">
            Completa la priorización del backlog para editar épicas, historias, prioridades y sprints
            conversando con Klark.
          </p>
        </div>
      </section>
    );
  }

  const quotaLabel =
    remaining === null
      ? 'Ilimitado'
      : remaining !== undefined
        ? `${remaining} restantes`
        : null;

  const lastAssistantIndex = messages.reduce(
    (found, msg, index) => (msg.role === 'assistant' ? index : found),
    -1
  );
  const showLiveThread = traceLive && trace.length > 0;
  const showSettledThread = !traceLive && trace.length > 0 && lastAssistantIndex >= 0;
  const showSettledStandalone = !traceLive && trace.length > 0 && lastAssistantIndex < 0;

  return (
    <section className="harness-chat harness-chat--drawer" aria-label="Klark">
      <header className="harness-chat__header">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {quotaLabel ? (
              <span className="text-[11px] tabular-nums text-subtle">{quotaLabel}</span>
            ) : null}
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            <span className="text-primary">K</span>lark
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Edita historias, épicas, prioridad y sprints sobre tu workspace.
          </p>
        </div>
        {headerActions}
      </header>

      <div className="harness-chat__body" ref={bodyRef}>
        {isLoadingHistory ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-sm text-muted">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
            Cargando conversación…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center gap-3 py-2">
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-foreground">
                Qué puede hacer Klark
              </p>
              <p className="mt-1 text-sm text-muted">
                Ejemplos orientativos. Escribe abajo lo que necesites sobre tu proyecto.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              {EXAMPLES.map((item) => (
                <div key={item.label} className="harness-chat__suggestion harness-chat__suggestion--static">
                  <span className="text-[11px] text-subtle">{item.hint}</span>
                  <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                  <span className="line-clamp-2 text-xs leading-relaxed text-muted">{item.example}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`harness-chat__msg ${msg.role === 'user' ? 'harness-chat__msg--user' : ''}`}
            >
              <div
                className={`harness-chat__avatar ${
                  msg.role === 'user' ? 'harness-chat__avatar--user' : 'harness-chat__avatar--assistant'
                }`}
                aria-hidden
              >
                {msg.role === 'user' ? 'Tú' : 'K'}
              </div>
              <div className="min-w-0">
                {showSettledThread && index === lastAssistantIndex ? (
                  <div className="mb-1.5">
                    <HarnessThoughtThread
                      steps={trace}
                      live={false}
                      startedAt={traceStartedAt}
                      endedAt={traceEndedAt}
                    />
                  </div>
                ) : null}
                <div
                  className={`harness-chat__bubble ${
                    msg.role === 'user'
                      ? 'harness-chat__bubble--user'
                      : 'harness-chat__bubble--assistant'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="harness-chat__md">
                      <ThoughtMarkdown text={msg.content} compact />
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                <p className={`harness-chat__meta ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {msg.role === 'user' ? 'Tú' : 'Klark'} · {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}

        {showLiveThread || showSettledStandalone ? (
          <div className="harness-chat__msg">
            <div className="harness-chat__avatar harness-chat__avatar--assistant" aria-hidden>
              K
            </div>
            <div className="min-w-0 pt-1">
              <HarnessThoughtThread
                steps={trace}
                live={showLiveThread}
                startedAt={traceStartedAt}
                endedAt={traceEndedAt}
              />
            </div>
          </div>
        ) : null}

        {pendingConfirm ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
            <p className="text-[11px] font-medium text-subtle">Confirmación requerida</p>
            <p className="mt-1.5 text-sm font-medium text-foreground">{pendingConfirm.label}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSending}
                className="cursor-pointer rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                disabled={isSending}
                className="cursor-pointer rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="harness-chat__composer">
        <div className="harness-chat__composer-shell">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Ej: Asigna prioridad Should a HU-020…"
            disabled={isSending}
            className="max-h-33 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-subtle disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="Enviar mensaje"
          >
            {isSending ? <SpinnerIcon /> : <SendIcon />}
          </button>
        </div>
        <p className="mt-2 px-1 text-[11px] text-subtle">
          Enter para enviar · Shift+Enter para nueva línea · Esc para cerrar
        </p>
      </form>
    </section>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
