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

const selectedFrameworkBtn =
  'inline-flex cursor-pointer items-center justify-center rounded-lg bg-elevated px-4 py-2 text-sm font-medium text-foreground';
const idleFrameworkBtn =
  'inline-flex cursor-pointer items-center justify-center rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground';
const compactSelectedFrameworkBtn =
  'inline-flex cursor-pointer items-center justify-center rounded-lg bg-elevated px-2.5 py-1.5 text-[12px] font-medium text-foreground';
const compactIdleFrameworkBtn =
  'inline-flex cursor-pointer items-center justify-center rounded-lg bg-surface-muted px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground';

interface FrameworkSelectorProps {
  value: PrioritizationFramework;
  onChange: (framework: PrioritizationFramework) => void;
  disabled?: boolean;
  centered?: boolean;
  hideLabel?: boolean;
  size?: 'default' | 'compact';
}

export function FrameworkSelector({
  value,
  onChange,
  disabled,
  centered,
  hideLabel,
  size = 'default',
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

  const isCompact = size === 'compact';
  const selectedBtn = isCompact ? compactSelectedFrameworkBtn : selectedFrameworkBtn;
  const idleBtn = isCompact ? compactIdleFrameworkBtn : idleFrameworkBtn;

  return (
    <div
      className={[
        'flex flex-col gap-1.5',
        centered ? 'items-center' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {hideLabel ? null : <p className="text-[12px] text-subtle">Metodología</p>}
      <div
        className={[
          'flex flex-wrap gap-2',
          centered ? 'justify-center' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="group"
        aria-label="Metodología de priorización"
      >
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
                aria-pressed={isActive}
                aria-label={desc.label}
                className={[
                  isActive ? selectedBtn : idleBtn,
                  !opt.enabled || disabled ? 'cursor-not-allowed opacity-40' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
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
