'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { KANBAN_COLUMNS, type KanbanStatus } from '@/lib/types/execution';

export const EXECUTION_STATUS_STYLES: Record<KanbanStatus, string> = {
  todo: 'border-slate-400/40 bg-slate-500/10 text-slate-300',
  in_progress: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  code_review: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  done: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
};

function statusLabel(status: KanbanStatus): string {
  return KANBAN_COLUMNS.find((col) => col.id === status)?.label ?? status;
}

export function ExecutionStatusBadge({ status }: { status: KanbanStatus }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        EXECUTION_STATUS_STYLES[status],
      ].join(' ')}
    >
      {statusLabel(status)}
    </span>
  );
}

const STATUS_DOT_CLASS: Record<KanbanStatus, string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  code_review: 'bg-amber-500',
  done: 'bg-emerald-500',
};

interface ExecutionStatusSelectProps {
  status: KanbanStatus;
  onChange: (status: KanbanStatus) => void;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
  variant?: 'pill' | 'ghost';
}

export function ExecutionStatusSelect({
  status,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
  className = '',
  variant = 'pill',
}: ExecutionStatusSelectProps) {
  const isGhost = variant === 'ghost';
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [listStyle, setListStyle] = useState({ top: 0, left: 0, minWidth: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const minWidth = Math.max(rect.width, 140);
    const left = Math.min(
      Math.max(12, rect.left),
      window.innerWidth - 12 - minWidth
    );
    setListStyle({
      top: rect.bottom + 6,
      left,
      minWidth,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };

    const handleReposition = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape, true);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape, true);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updatePosition]);

  const list =
    open && mounted
      ? createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="fixed z-300 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-2xl animate-[fadeIn_0.15s_ease-out]"
            style={{
              top: listStyle.top,
              left: listStyle.left,
              minWidth: listStyle.minWidth,
            }}
          >
            {KANBAN_COLUMNS.map((column) => {
              const isSelected = column.id === status;
              return (
                <button
                  key={column.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(column.id);
                    setOpen(false);
                  }}
                  className={[
                    'flex w-full cursor-pointer items-center rounded-lg px-2 py-1.5 text-left transition-colors',
                    isSelected ? 'bg-surface-hover' : 'hover:bg-surface-hover/70',
                  ].join(' ')}
                >
                  {isGhost ? (
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[column.id]}`} />
                      {column.label}
                    </span>
                  ) : (
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        EXECUTION_STATUS_STYLES[column.id],
                      ].join(' ')}
                    >
                      {column.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={[
          'inline-flex cursor-pointer items-center whitespace-nowrap transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong',
          isGhost
            ? [
                'h-8 w-full gap-2 rounded-md px-2 text-sm text-foreground hover:bg-surface-hover',
                open ? 'bg-surface-hover' : '',
              ].join(' ')
            : [
                'gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                EXECUTION_STATUS_STYLES[status],
                open ? 'ring-1 ring-border-strong/60' : 'hover:opacity-90',
              ].join(' '),
        ].join(' ')}
      >
        {isGhost ? (
          <>
            <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[status]}`} />
            <span className="min-w-0 flex-1 truncate text-left">{statusLabel(status)}</span>
          </>
        ) : (
          <>
            <span>{statusLabel(status)}</span>
            <svg
              className={[
                'h-3 w-3 shrink-0 opacity-70 transition-transform',
                open ? 'rotate-180' : '',
              ].join(' ')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </>
        )}
      </button>
      {list}
    </div>
  );
}
