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

  return (
    <div
      className={[
        'group relative overflow-hidden rounded-lg border border-border/70 bg-surface-muted/30',
        fillSpace ? 'flex min-h-0 flex-1 flex-col' : '',
      ].join(' ')}
    >
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
        <span
          className={[
            'h-1.5 w-1.5 shrink-0 rounded-full',
            isComplete ? 'bg-foreground/30' : 'bg-foreground/60',
          ].join(' ')}
          aria-hidden
        />
        <span className="text-[12px] font-medium text-foreground">
          {isComplete && !expanded ? preview : 'Razonamiento'}
        </span>
        {duration ? (
          <span className="text-[11px] tabular-nums text-subtle">{duration}</span>
        ) : null}
        {!isComplete ? (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-subtle">
            pensando
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1 w-1 animate-bounce rounded-full bg-foreground/40"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
          </span>
        ) : (
          canToggle && (
            <span className="ml-auto text-[11px] text-subtle">
              {expanded ? 'Ocultar' : 'Ver'}
            </span>
          )
        )}
      </button>

      {showBody && (
        <div
          ref={bodyRef}
          onScroll={isStreaming ? handleBodyScroll : undefined}
          className={[
            'relative border-t border-border/50 px-3.5 pb-3.5 pt-3',
            fillSpace
              ? 'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain'
              : isStreaming
                ? 'max-h-[min(50vh,400px)] min-h-52 overflow-y-auto overscroll-contain'
                : '',
          ].join(' ')}
        >
          {isWaitingForText ? (
            <div className="flex flex-col gap-2 py-1">
              <div className="h-2 w-[88%] animate-pulse rounded-full bg-border" />
              <div className="h-2 w-[64%] animate-pulse rounded-full bg-border/70" />
            </div>
          ) : (
            <div ref={contentRef} className={fillSpace ? 'min-h-0 flex-1' : undefined}>
              <ThoughtMarkdown text={displayText} compact={nestable} />
              {!isComplete && (
                <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded-sm bg-foreground/50 align-middle" />
              )}
            </div>
          )}
          {isLive && isStreaming && (
            <div
              aria-hidden="true"
              className="pointer-events-none sticky bottom-0 -mb-3.5 h-8 bg-linear-to-t from-surface via-surface/80 to-transparent"
            />
          )}
        </div>
      )}
    </div>
  );
}
