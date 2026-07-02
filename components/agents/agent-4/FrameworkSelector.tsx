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
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Metodología
      </label>
      <div className="flex flex-wrap gap-1.5">
        {FRAMEWORK_OPTIONS.map((opt) => {
          const desc = FRAMEWORK_DESCRIPTIONS[opt.id];
          const isActive = value === opt.id;

          return (
            <div key={opt.id} className="relative">
              <button
                ref={(el) => {
                  if (el) buttonRefs.current.set(opt.id, el);
                  else buttonRefs.current.delete(opt.id);
                }}
                disabled={!opt.enabled || disabled}
                onClick={() => opt.enabled && onChange(opt.id)}
                onMouseEnter={() => opt.enabled && showTooltip(opt.id)}
                onMouseLeave={hideTooltip}
                className={`relative inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                    : opt.enabled
                      ? 'border-border bg-background text-muted-foreground hover:border-border/80 hover:bg-muted/50'
                      : 'cursor-not-allowed border-border/40 bg-muted/30 text-muted-foreground/40'
                } disabled:opacity-60`}
              >
                {desc.label}
              </button>
            </div>
          );
        })}
      </div>

      {hoveredId && createPortal(
        <div
          className="fixed z-[9999] w-72 rounded-lg border border-border bg-surface p-3 shadow-xl"
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
          <p className="text-[11px] font-semibold text-foreground">
            {FRAMEWORK_DESCRIPTIONS[hoveredId].label}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {FRAMEWORK_DESCRIPTIONS[hoveredId].summary}
          </p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground/70">
            {FRAMEWORK_DESCRIPTIONS[hoveredId].details}
          </p>
          <div
            className="absolute left-1/2 -bottom-1 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-border bg-surface"
          />
        </div>,
        document.body
      )}
    </div>
  );
}
