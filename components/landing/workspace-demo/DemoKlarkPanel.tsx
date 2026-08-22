"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_KLARK } from "./demo-data";

interface DemoKlarkPanelProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

type DemoPhase = "idle" | "typing" | "sent" | "thinking" | "reply";

export function DemoKlarkPanel({ open, onClose, onOpen }: DemoKlarkPanelProps) {
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [typedUser, setTypedUser] = useState("");
  const [typedReply, setTypedReply] = useState("");
  const timersRef = useRef<number[]>([]);
  const prefersReducedRef = useRef(false);

  const clearTimers = () => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  useEffect(() => {
    prefersReducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!open) {
      clearTimers();
      setPhase("idle");
      setTypedUser("");
      setTypedReply("");
      return;
    }

    clearTimers();
    setTypedUser("");
    setTypedReply("");

    if (prefersReducedRef.current) {
      setTypedUser(DEMO_KLARK.userMessage);
      setTypedReply(DEMO_KLARK.reply);
      setPhase("reply");
      return;
    }

    setPhase("typing");
    const message = DEMO_KLARK.userMessage;
    let i = 0;

    const typeNext = () => {
      i += 1;
      setTypedUser(message.slice(0, i));
      if (i < message.length) {
        schedule(typeNext, 28);
      } else {
        schedule(() => {
          setPhase("sent");
          schedule(() => {
            setPhase("thinking");
            schedule(() => {
              setPhase("reply");
              const reply = DEMO_KLARK.reply;
              let j = 0;
              const typeReply = () => {
                j += 1;
                setTypedReply(reply.slice(0, j));
                if (j < reply.length) {
                  schedule(typeReply, 12);
                }
              };
              typeReply();
            }, 1600);
          }, 450);
        }, 350);
      }
    };

    schedule(typeNext, 400);

    return clearTimers;
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="absolute right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-white shadow-lg transition-opacity hover:bg-primary-hover"
        aria-label="Abrir Klark"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-[11px] font-bold">
          K
        </span>
        <span className="text-[13px] font-semibold tracking-tight">Klark</span>
      </button>
    );
  }

  const showUserBubble = phase === "sent" || phase === "thinking" || phase === "reply";
  const showComposerDraft = phase === "typing";

  return (
    <aside
      className="absolute inset-y-3 right-3 z-30 flex w-[min(100%,22rem)] flex-col overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-2xl md:w-[24rem]"
      aria-label="Klark"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground">Klark</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">
            Edita historias, épicas y el stack del proyecto.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            tabIndex={-1}
            className="rounded-lg px-2 py-1.5 text-[11px] text-muted"
            aria-label="Limpiar"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-label="Cerrar Klark"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {showUserBubble ? (
          <div className="ml-auto max-w-[85%] animate-[fadeIn_0.25s_ease]">
            <p className="mb-1 text-right text-[10px] text-subtle">Tú · {DEMO_KLARK.userTime}</p>
            <div className="rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-sm font-medium text-background">
              {DEMO_KLARK.userMessage}
            </div>
          </div>
        ) : null}

        {phase === "thinking" || phase === "reply" ? (
          <div className="flex max-w-[95%] gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-elevated text-[11px] font-bold text-foreground">
              K
            </span>
            <div className="min-w-0 flex-1">
              {phase === "thinking" ? (
                <div className="rounded-2xl rounded-tl-md border border-border bg-surface-muted/40 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
                    <p className="text-sm font-medium text-muted">
                      {DEMO_KLARK.thinkingLabel}
                      <span className="inline-block w-6 overflow-hidden align-bottom">…</span>
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    <p className="text-[12px] leading-relaxed text-subtle">{DEMO_KLARK.thinkingStep}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl rounded-tl-md border border-border bg-surface-muted/40 px-3.5 py-2.5">
                  <p className="text-sm leading-relaxed text-foreground">
                    {typedReply}
                    {typedReply.length < DEMO_KLARK.reply.length ? (
                      <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-primary align-middle" />
                    ) : null}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-border px-3 py-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <div className="min-h-10 w-full text-[13px] text-foreground">
            {showComposerDraft ? (
              <span>
                {typedUser}
                <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-primary align-middle" />
              </span>
            ) : (
              <span className="text-subtle">Ej: Asigna prioridad Should a HU-020…</span>
            )}
          </div>
          <button
            type="button"
            tabIndex={-1}
            className={[
              "mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity",
              showComposerDraft && typedUser.length > 0 ? "opacity-100" : "opacity-50",
            ].join(" ")}
            aria-label="Enviar"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-7.5-15-7.5v6l10 1.5-10 1.5v6z" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-subtle">
          Enter para enviar · Shift+Enter para nueva línea · Esc para cerrar
        </p>
      </div>
    </aside>
  );
}
