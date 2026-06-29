'use client';

import { useEffect, useRef, useState } from 'react';
import type { ThoughtBlockEntry } from '@/lib/types/agent-activity';
import { formatDuration } from '@/lib/utils/agent-activity-reducer';
import { ThoughtMarkdown } from './ThoughtMarkdown';

interface ThoughtBlockProps {
  entry: ThoughtBlockEntry;
  variant?: 'default' | 'live';
  /** Estilo integrado en la línea de tiempo (sin caja pesada) */
  nestable?: boolean;
  /** En modal live: ocupa el espacio vertical disponible */
  fillAvailable?: boolean;
}

function extractPreview(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('**') && line.endsWith('**')) {
      return line.slice(2, -2);
    }
    if (line.startsWith('#')) {
      return line.replace(/^#+\s*/, '');
    }
    if (line.startsWith('>')) {
      return line.replace(/^>\s*/, '');
    }
    if (line.length > 0) {
      return line.length > 72 ? `${line.slice(0, 72)}…` : line;
    }
  }
  return 'Razonamiento del modelo';
}

export function ThoughtBlock({
  entry,
  variant = 'default',
  nestable = false,
  fillAvailable = false,
}: ThoughtBlockProps) {
  const isLive = variant === 'live';
  const isComplete = entry.endedAt !== undefined;
  const [expanded, setExpanded] = useState(!isComplete || !nestable);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const duration =
    isComplete && entry.endedAt
      ? formatDuration(entry.endedAt - entry.startedAt)
      : null;

  const displayText = entry.text.trim();
  const isWaitingForText = !displayText && !isComplete;
  const preview = extractPreview(displayText);

  useEffect(() => {
    if (isComplete && isLive && nestable) {
      setExpanded(false);
    }
  }, [isComplete, isLive, nestable]);

  const showBody = !isComplete || expanded;
  const isStreaming = isLive && !isComplete && showBody;
  const fillSpace = fillAvailable && isStreaming;

  useEffect(() => {
    if (!isStreaming) return;
    stickToBottomRef.current = true;
  }, [entry.id, isStreaming]);

  // Auto-scroll mientras crece el contenido (ResizeObserver cubre el layout post-render).
  useEffect(() => {
    if (!isStreaming) return;

    const scrollEl = bodyRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;

    const scrollToBottom = () => {
      if (!stickToBottomRef.current) return;
      scrollEl.scrollTop = scrollEl.scrollHeight;
    };

    scrollToBottom();

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(scrollToBottom);
    });
    observer.observe(contentEl);

    return () => observer.disconnect();
  }, [isStreaming, entry.id, isWaitingForText]);

  // Fallback cuando llegan chunks de texto.
  useEffect(() => {
    if (!isStreaming || !stickToBottomRef.current) return;
    const el = bodyRef.current;
    if (!el) return;

    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [displayText, isStreaming]);

  const handleBodyScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 48;
  };

  if (!displayText && isComplete) return null;

  const canToggle = isComplete && displayText.length > 0;

  const containerClass = nestable
    ? 'rounded-lg border border-border/50 bg-surface/50'
    : 'agent-thought rounded-xl border border-primary/20 bg-[color-mix(in_srgb,var(--primary)_4%,var(--surface))]';

  return (
    <div
      className={[
        'group relative overflow-hidden',
        fillSpace ? 'flex min-h-0 flex-1 flex-col' : '',
        containerClass,
      ].join(' ')}
    >
      {!nestable && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-0.5 bg-linear-to-b from-primary/70 via-primary/30 to-transparent"
        />
      )}

      <button
        type="button"
        onClick={() => canToggle && setExpanded((prev) => !prev)}
        className={[
          'flex w-full shrink-0 items-center gap-2 px-3 py-2 text-left',
          canToggle ? 'cursor-pointer hover:bg-surface-hover/50' : 'cursor-default',
        ].join(' ')}
        disabled={!canToggle}
        aria-expanded={showBody}
      >
        <span className="font-mono text-[10px] text-primary/80">✦</span>
        <span className="text-xs font-medium text-foreground/90">
          {isComplete && !expanded ? preview : 'Razonamiento'}
        </span>
        {duration && (
          <span className="font-mono text-[10px] text-muted/60">{duration}</span>
        )}
        {!isComplete ? (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-muted">pensando</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1 w-1 animate-bounce rounded-full bg-primary/70"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
          </span>
        ) : (
          canToggle && (
            <span className="ml-auto font-mono text-[10px] text-muted/50">
              {expanded ? '▾' : '▸'}
            </span>
          )
        )}
      </button>

      {showBody && (
        <div
          ref={bodyRef}
          onScroll={isStreaming ? handleBodyScroll : undefined}
          className={[
            'relative border-t border-border/40 px-3 pb-3 pt-2',
            fillSpace
              ? 'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain'
              : isStreaming
                ? 'max-h-[min(50vh,400px)] min-h-56 overflow-y-auto overscroll-contain'
                : '',
          ].join(' ')}
        >
          {isWaitingForText ? (
            <div className="flex flex-col gap-2 py-1">
              <div className="h-2 w-[90%] animate-pulse rounded-full bg-muted/20" />
              <div className="h-2 w-[70%] animate-pulse rounded-full bg-muted/15" />
            </div>
          ) : (
            <div ref={contentRef} className={fillSpace ? 'min-h-0 flex-1' : undefined}>
              <ThoughtMarkdown text={displayText} compact={nestable} />
              {!isComplete && (
                <span className="ml-0.5 inline-block h-3 w-1 animate-pulse rounded-sm bg-primary/70 align-middle" />
              )}
            </div>
          )}
          {isLive && isStreaming && (
            <div
              aria-hidden="true"
              className="pointer-events-none sticky bottom-0 -mb-3 h-6 bg-linear-to-t from-surface/95 to-transparent"
            />
          )}
        </div>
      )}
    </div>
  );
}
