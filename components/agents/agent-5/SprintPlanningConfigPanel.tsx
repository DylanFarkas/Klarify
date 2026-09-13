'use client';

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { SprintPlanningConfig } from '@/lib/types/agent-5';
import {
  SPRINT_CONFIG_DESCRIPTIONS,
  type SprintConfigFieldId,
} from '@/lib/constants/agent-5';
import { DatePicker } from '@/components/ui/DatePicker';
import { formatDateEs } from '@/lib/utils/dates';

interface SprintPlanningConfigPanelProps {
  config: SprintPlanningConfig;
  onChange: (config: SprintPlanningConfig) => void;
  disabled: boolean;
  isApproved: boolean;
  hasPlan?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  regenerateDisabled?: boolean;
}

function formatDate(dateStr: string): string {
  return formatDateEs(dateStr);
}

function ConfigFieldLabel({
  fieldId,
  children,
  onShowTooltip,
  onHideTooltip,
  setRef,
}: {
  fieldId: SprintConfigFieldId;
  children: ReactNode;
  onShowTooltip: (id: SprintConfigFieldId) => void;
  onHideTooltip: () => void;
  setRef: (el: HTMLSpanElement | null) => void;
}) {
  return (
    <span
      ref={setRef}
      onMouseEnter={() => onShowTooltip(fieldId)}
      onMouseLeave={onHideTooltip}
      className="cursor-help border-b border-dotted border-muted/40 text-muted transition-colors hover:border-border-strong hover:text-foreground"
    >
      {children}
    </span>
  );
}

export function SprintPlanningConfigPanel({
  config,
  onChange,
  disabled,
  isApproved,
  hasPlan = false,
  onRegenerate,
  isRegenerating = false,
  regenerateDisabled = false,
}: SprintPlanningConfigPanelProps) {
  const [hoveredId, setHoveredId] = useState<SprintConfigFieldId | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const labelRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback((id: SprintConfigFieldId) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    const el = labelRefs.current.get(id);
    if (el) {
      const rect = el.getBoundingClientRect();
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

  if (isApproved) {
    return (
      <div className="rounded-xl border border-border bg-surface px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-foreground">Plan aprobado</span>
          <span className="text-subtle">·</span>
          <span>{config.sprintCapacitySp} SP/sprint · {config.sprintDurationWeeks} sem · Inicio {formatDate(config.projectStartDate)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-[13px] font-medium text-subtle">Configuración de sprints</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <ConfigFieldLabel
            fieldId="capacity"
            onShowTooltip={showTooltip}
            onHideTooltip={hideTooltip}
            setRef={(el) => {
              if (el) labelRefs.current.set('capacity', el);
              else labelRefs.current.delete('capacity');
            }}
          >
            Capacidad:
          </ConfigFieldLabel>
          <input
            type="number"
            min={1}
            max={200}
            value={config.sprintCapacitySp}
            onChange={(e) => onChange({ ...config, sprintCapacitySp: Math.max(1, Number(e.target.value) || 1) })}
            disabled={disabled}
            className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium tabular-nums text-foreground focus:border-border-strong focus:outline-none disabled:opacity-50"
          />
          <span className="text-xs text-subtle">SP/sprint</span>
        </label>

        <span className="h-5 w-px bg-border" />

        <label className="flex items-center gap-2 text-sm">
          <ConfigFieldLabel
            fieldId="duration"
            onShowTooltip={showTooltip}
            onHideTooltip={hideTooltip}
            setRef={(el) => {
              if (el) labelRefs.current.set('duration', el);
              else labelRefs.current.delete('duration');
            }}
          >
            Duración:
          </ConfigFieldLabel>
          <input
            type="number"
            min={1}
            max={8}
            value={config.sprintDurationWeeks}
            onChange={(e) => onChange({ ...config, sprintDurationWeeks: Math.max(1, Number(e.target.value) || 1) })}
            disabled={disabled}
            className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium tabular-nums text-foreground focus:border-border-strong focus:outline-none disabled:opacity-50"
          />
          <span className="text-xs text-subtle">semanas</span>
        </label>

        <span className="h-5 w-px bg-border" />

        <label className="flex items-center gap-2 text-sm">
          <ConfigFieldLabel
            fieldId="start"
            onShowTooltip={showTooltip}
            onHideTooltip={hideTooltip}
            setRef={(el) => {
              if (el) labelRefs.current.set('start', el);
              else labelRefs.current.delete('start');
            }}
          >
            Inicio:
          </ConfigFieldLabel>
          <DatePicker
            value={config.projectStartDate}
            onChange={(iso) => onChange({ ...config, projectStartDate: iso })}
            disabled={disabled}
          />
        </label>
        </div>

        {hasPlan && onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={disabled || isRegenerating || regenerateDisabled}
            className={[
              'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2',
              'text-sm font-medium text-muted',
              'transition-colors hover:bg-surface-hover hover:text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-40',
            ].join(' ')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            {isRegenerating ? 'Regenerando…' : 'Regenerar'}
          </button>
        )}
      </div>

      {hoveredId && createPortal(
        <div
          className="fixed z-9999 w-72 rounded-lg border border-border bg-surface p-3 shadow-xl"
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
            {SPRINT_CONFIG_DESCRIPTIONS[hoveredId].label}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {SPRINT_CONFIG_DESCRIPTIONS[hoveredId].summary}
          </p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground/70">
            {SPRINT_CONFIG_DESCRIPTIONS[hoveredId].details}
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
