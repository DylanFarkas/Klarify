'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { formatDateEs } from '@/lib/utils/dates';
import { parseLocalDate, toIsoDate } from '@/lib/utils/sprint-dates';

import 'react-day-picker/style.css';

const POPOVER_WIDTH = 300;
const POPOVER_HEIGHT = 340;
const VIEWPORT_PADDING = 12;

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

function computePopoverPosition(rect: DOMRect) {
  let left = rect.left;
  let top = rect.bottom + 8;

  if (left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
    left = Math.max(VIEWPORT_PADDING, rect.right - POPOVER_WIDTH);
  }
  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING;
  }

  if (top + POPOVER_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
    top = rect.top - POPOVER_HEIGHT - 8;
  }
  if (top < VIEWPORT_PADDING) {
    top = VIEWPORT_PADDING;
  }

  return { top, left };
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  className = '',
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selected = value ? parseLocalDate(value) : undefined;
  const fromDate = minDate ? parseLocalDate(minDate) : undefined;
  const toDate = maxDate ? parseLocalDate(maxDate) : undefined;

  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(computePopoverPosition(rect));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
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

  const popover =
    open && mounted
      ? createPortal(
          <div
            ref={popoverRef}
            className="date-picker-popover fixed z-300 rounded-xl border border-border bg-surface p-3 shadow-2xl animate-[fadeIn_0.15s_ease-out]"
            style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
            role="dialog"
            aria-label="Selector de fecha"
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={(date) => {
                if (date) {
                  onChange(toIsoDate(date));
                  setOpen(false);
                }
              }}
              locale={es}
              weekStartsOn={1}
              disabled={[
                ...(fromDate ? [{ before: fromDate }] : []),
                ...(toDate ? [{ after: toDate }] : []),
              ]}
              classNames={{ root: 'rdp-klarify' }}
            />
          </div>,
          document.body
        )
      : null;

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (!open) updatePosition();
          setOpen((o) => !o);
        }}
        className={[
          'inline-flex w-full min-w-38 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2',
          'text-sm font-bold text-foreground',
          'hover:border-border-strong hover:bg-surface-hover',
          'focus:border-primary focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors cursor-pointer',
        ].join(' ')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg className="h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <span className="truncate">{value ? formatDateEs(value) : 'Seleccionar fecha'}</span>
      </button>
      {popover}
    </div>
  );
}
