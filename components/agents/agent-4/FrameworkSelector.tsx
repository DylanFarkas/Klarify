/**
 * @fileoverview Selector de framework de priorización con tooltips descriptivos.
 */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import { FRAMEWORK_DESCRIPTIONS } from '@/lib/constants/agent-4';

const FRAMEWORK_OPTIONS = [
  { id: 'moscow' as const, enabled: true },
  { id: 'wsjf' as const, enabled: true },
  { id: 'rice' as const, enabled: true },
  { id: 'value-effort' as const, enabled: true },
];

interface FrameworkSelectorProps {
  value: PrioritizationFramework;
  onChange: (framework: PrioritizationFramework) => void;
  disabled?: boolean;
}

export function FrameworkSelector({
  value,
  onChange,
  disabled,
}: FrameworkSelectorProps) {
  const [hoveredId, setHoveredId] = useState<PrioritizationFramework | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback((id: PrioritizationFramework) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    const btn = buttonRefs.current.get(id);
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setTooltipPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
    setHoveredId(id);
  }, []);

  const hideTooltip = useCallback(() => {
    hideTimeout.current = setTimeout(() => {
      setHoveredId(null);
      hideTimeout.current = null;
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-subtle">Metodología</label>
      <div className="flex flex-wrap gap-1.5">
        {FRAMEWORK_OPTIONS.map((opt) => {
          const desc = FRAMEWORK_DESCRIPTIONS[opt.id];
          const isActive = value === opt.id;

          return (
            <div key={opt.id} className="relative">
              <button
                type="button"
                ref={(el) => {
                  if (el) buttonRefs.current.set(opt.id, el);
                  else buttonRefs.current.delete(opt.id);
                }}
                disabled={!opt.enabled || disabled}
                onClick={() => opt.enabled && onChange(opt.id)}
                onMouseEnter={() => opt.enabled && showTooltip(opt.id)}
                onMouseLeave={hideTooltip}
                className={[
                  'inline-flex cursor-pointer items-center rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                  isActive
                    ? 'border-foreground bg-foreground text-background'
                    : opt.enabled
                      ? 'border-border bg-background text-muted hover:border-border-strong hover:bg-surface-hover hover:text-foreground'
                      : 'cursor-not-allowed border-border text-subtle opacity-40',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                ].join(' ')}
              >
                {desc.label}
              </button>
            </div>
          );
        })}
      </div>

      {hoveredId
        ? createPortal(
            <div
              className="fixed z-9999 w-72 rounded-lg border border-border bg-surface p-3"
              style={{
                top: tooltipPos.top,
                left: tooltipPos.left,
                transform: 'translate(-50%, -100%)',
              }}
              onMouseEnter={() => {
                if (hideTimeout.current) {
                  clearTimeout(hideTimeout.current);
                  hideTimeout.current = null;
                }
              }}
              onMouseLeave={hideTooltip}
            >
              <p className="text-[12px] font-medium text-foreground">
                {FRAMEWORK_DESCRIPTIONS[hoveredId].label}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {FRAMEWORK_DESCRIPTIONS[hoveredId].summary}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-subtle">
                {FRAMEWORK_DESCRIPTIONS[hoveredId].details}
              </p>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
