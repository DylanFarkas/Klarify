'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const VIEWPORT_PADDING = 12;
const LIST_GAP = 6;
const DEFAULT_MAX_HEIGHT = 240;

export interface DropdownSelectOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownSelectOption[];
  placeholder: string;
  disabled?: boolean;
  className?: string;
  /** Compact trigger for dense tables / inline editors. */
  size?: 'default' | 'compact';
  'aria-label'?: string;
}

function computeListStyle(triggerRect: DOMRect) {
  const left = Math.min(
    Math.max(VIEWPORT_PADDING, triggerRect.left),
    window.innerWidth - VIEWPORT_PADDING - triggerRect.width
  );
  const top = triggerRect.bottom + LIST_GAP;
  const availableBelow = Math.max(
    120,
    window.innerHeight - top - VIEWPORT_PADDING
  );
  const maxHeight = Math.min(DEFAULT_MAX_HEIGHT, availableBelow);

  return {
    top,
    left,
    width: triggerRect.width,
    maxHeight,
  };
}

export function DropdownSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = '',
  size = 'default',
  'aria-label': ariaLabel,
}: DropdownSelectProps) {
  const isCompact = size === 'compact';
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [listStyle, setListStyle] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: DEFAULT_MAX_HEIGHT,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedLabel = options.find((option) => option.value === value)?.label;

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setListStyle(computeListStyle(rect));
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
            className="fixed z-300 overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl animate-[fadeIn_0.15s_ease-out]"
            style={{
              top: listStyle.top,
              left: listStyle.left,
              width: listStyle.width,
              maxHeight: listStyle.maxHeight,
            }}
          >
            {options.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-muted">{placeholder}</p>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={[
                      'block w-full cursor-pointer text-left transition-colors',
                      isCompact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2.5 text-sm',
                      isSelected
                        ? 'bg-surface-hover text-foreground'
                        : 'text-foreground hover:bg-surface-hover',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        id={id}
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
          'flex w-full cursor-pointer items-center justify-between text-left transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isCompact
            ? 'gap-1 rounded-lg border border-border bg-surface px-1.5 py-1 text-xs font-bold'
            : 'gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm',
          open ? 'border-border-strong' : 'hover:border-border',
          selectedLabel ? 'text-foreground' : 'text-muted',
        ].join(' ')}
      >
        <span className="min-w-0 truncate">{selectedLabel ?? placeholder}</span>
        <svg
          className={[
            'shrink-0 text-subtle transition-transform',
            isCompact ? 'h-3 w-3' : 'h-4 w-4',
            open ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {list}
    </div>
  );
}
