'use client';

import type { PlannedSprint, SprintDatePatch, SprintDurationUnit } from '@/lib/types/agent-5';
import { DatePicker } from '@/components/ui/DatePicker';
import { formatDateRangeEs } from '@/lib/utils/dates';
import { getMinStartDate, getSprintDuration } from '@/lib/utils/sprint-dates';

const MAX_WEEKS = 12;
const MAX_DAYS = 90;

interface SprintDateEditorProps {
  sprint: PlannedSprint;
  sprintIndex: number;
  allSprints: PlannedSprint[];
  defaultDurationWeeks: number;
  disabled?: boolean;
  variant?: 'inline' | 'modal';
  onChange: (patch: SprintDatePatch) => void;
}

export function SprintDateEditor({
  sprint,
  sprintIndex,
  allSprints,
  defaultDurationWeeks,
  disabled = false,
  variant = 'inline',
  onChange,
}: SprintDateEditorProps) {
  const { unit, amount } = getSprintDuration(sprint, defaultDurationWeeks);
  const minStart = getMinStartDate(allSprints, sprintIndex);

  const wrapperClass =
    variant === 'modal'
      ? 'rounded-xl border border-border bg-surface-muted/30 px-4 py-4'
      : 'mt-3 rounded-lg border border-border bg-surface-muted/30 px-4 py-3';

  const handleUnitChange = (nextUnit: SprintDurationUnit) => {
    if (nextUnit === unit) return;

    if (nextUnit === 'days') {
      const days =
        sprint.durationUnit === 'days' && sprint.durationDays != null
          ? sprint.durationDays
          : amount * 7;
      onChange({ durationUnit: 'days', durationDays: days, durationWeeks: undefined });
      return;
    }

    const weeks =
      unit === 'weeks'
        ? amount
        : Math.max(1, Math.ceil(amount / 7));
    onChange({ durationUnit: 'weeks', durationWeeks: weeks, durationDays: undefined });
  };

  return (
    <div className={wrapperClass}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">
          Fechas del sprint
        </span>
        <span className="text-[10px] text-muted">
          {formatDateRangeEs(sprint.startDate, sprint.endDate)}
        </span>
      </div>

      <div className={variant === 'modal' ? 'flex flex-col gap-4' : 'flex flex-wrap items-end gap-5'}>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted">Duración</span>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-lg border border-border bg-surface p-0.5"
              role="group"
              aria-label="Unidad de duración"
            >
              {(['weeks', 'days'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleUnitChange(option)}
                  className={[
                    'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                    unit === option
                      ? 'bg-primary text-white'
                      : 'text-muted hover:bg-surface-hover hover:text-foreground',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  ].join(' ')}
                >
                  {option === 'weeks' ? 'Semanas' : 'Días'}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={unit === 'weeks' ? MAX_WEEKS : MAX_DAYS}
              value={amount}
              onChange={(e) => {
                const raw = Number(e.target.value) || 1;
                if (unit === 'weeks') {
                  const weeks = Math.max(1, Math.min(MAX_WEEKS, raw));
                  onChange({ durationUnit: 'weeks', durationWeeks: weeks, durationDays: undefined });
                } else {
                  const days = Math.max(1, Math.min(MAX_DAYS, raw));
                  onChange({ durationUnit: 'days', durationDays: days, durationWeeks: undefined });
                }
              }}
              disabled={disabled}
              className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <span className="text-xs text-muted">
              {unit === 'weeks' ? 'semanas' : 'días naturales'}
            </span>
          </div>
          {unit === 'days' && (
            <p className="text-[10px] leading-relaxed text-muted">
              Los días cuentan de forma inclusive (ej. 5 días = inicio + 4 días de calendario).
            </p>
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Inicio</span>
          <DatePicker
            value={sprint.startDate}
            onChange={(iso) => onChange({ startDate: iso })}
            minDate={minStart}
            disabled={disabled}
            className="w-full"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Fin</span>
          <DatePicker
            value={sprint.endDate}
            onChange={(iso) => onChange({ endDate: iso })}
            minDate={sprint.startDate}
            disabled={disabled}
            className="w-full"
          />
        </label>
      </div>
    </div>
  );
}
