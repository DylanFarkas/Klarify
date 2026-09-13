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
  /** Ghost: fila tipo sidebar sin borde. */
  variant?: 'default' | 'ghost';
  /** Prefer opening above the trigger (sidebar footer) or auto-flip by viewport space. */
  placement?: 'auto' | 'top' | 'bottom';
  'aria-label'?: string;
}

interface ListStyle {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

function computeListStyle(
  triggerRect: DOMRect,
  placement: 'auto' | 'top' | 'bottom' = 'auto'
): ListStyle {
  const left = Math.min(
    Math.max(VIEWPORT_PADDING, triggerRect.left),
    window.innerWidth - VIEWPORT_PADDING - triggerRect.width
  );
  const width = triggerRect.width;

  const spaceBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_PADDING - LIST_GAP;
  const spaceAbove = triggerRect.top - VIEWPORT_PADDING - LIST_GAP;

  let openUp = placement === 'top';
  if (placement === 'auto') {
    openUp = spaceBelow < DEFAULT_MAX_HEIGHT && spaceAbove > spaceBelow;
  }

  if (openUp) {
    const maxHeight = Math.min(DEFAULT_MAX_HEIGHT, Math.max(120, spaceAbove));
    return {
      left,
      width,
      maxHeight,
      bottom: window.innerHeight - triggerRect.top + LIST_GAP,
    };
  }

  const maxHeight = Math.min(DEFAULT_MAX_HEIGHT, Math.max(120, spaceBelow));
  return {
    left,
    width,
    maxHeight,
    top: triggerRect.bottom + LIST_GAP,
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
  variant = 'default',
  placement = 'auto',
  'aria-label': ariaLabel,
}: DropdownSelectProps) {
  const isCompact = size === 'compact';
  const isGhost = variant === 'ghost';
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [listStyle, setListStyle] = useState<ListStyle>({
    left: 0,
    width: 0,
    maxHeight: DEFAULT_MAX_HEIGHT,
    top: 0,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedLabel = options.find((option) => option.value === value)?.label;

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setListStyle(computeListStyle(rect, placement));
  }, [placement]);

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
            className="fixed z-9999 overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl animate-[fadeIn_0.15s_ease-out]"
            style={{
              top: listStyle.top,
              bottom: listStyle.bottom,
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
          if (!open) {
            updatePosition();
          }
          setOpen((current) => !current);
        }}
        className={[
          'flex w-full cursor-pointer items-center justify-between text-left transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isGhost
            ? [
                'group h-8 gap-2 rounded-md px-2 text-sm hover:bg-surface-hover hover:text-foreground',
                open || selectedLabel ? 'text-foreground' : 'text-muted',
                open ? 'bg-surface-hover' : '',
              ].join(' ')
            : [
                isCompact
                  ? 'gap-1 rounded-lg border border-border bg-surface px-1.5 py-1 text-xs font-bold'
                  : 'gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm',
                open ? 'border-border-strong' : 'hover:border-border',
                selectedLabel ? 'text-foreground' : 'text-muted',
              ].join(' '),
        ].join(' ')}
      >
        <span className="min-w-0 truncate">{selectedLabel ?? placeholder}</span>
        <svg
          className={[
            'shrink-0 transition-transform',
            isGhost ? 'h-3.5 w-3.5 text-subtle opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100' : isCompact ? 'h-3.5 w-3.5 text-subtle' : 'h-4 w-4 text-subtle',
            open ? 'rotate-180 opacity-100' : '',
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
