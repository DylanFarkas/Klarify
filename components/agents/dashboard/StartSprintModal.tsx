'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PlannedSprint, SprintDatePatch, SprintPlan } from '@/lib/types/agent-5';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { SprintDateEditor } from '@/components/agents/agent-5/SprintDateEditor';
import { formatDateRangeEs } from '@/lib/utils/dates';
import {
  addDays,
  applySprintDatePatch,
  computeEndDateForDuration,
  toIsoDate,
} from '@/lib/utils/sprint-dates';

interface StartSprintModalProps {
  open: boolean;
  sprint: PlannedSprint;
  plan: SprintPlan;
  busy?: boolean;
  onClose: () => void;
  /** Guarda fechas/goal y marca el sprint como activo. */
  onConfirm: (input: {
    sprintId: string;
    goal: string;
    dates: SprintDatePatch;
  }) => Promise<void>;
}

type DurationPreset = {
  id: string;
  label: string;
  hint: string;
  apply: (sprint: PlannedSprint) => SprintDatePatch;
};

function todayIso(): string {
  return toIsoDate(new Date());
}

const PRESETS: DurationPreset[] = [
  {
    id: 'today-1w',
    label: 'Hoy · 1 semana',
    hint: '1 semana desde hoy',
    apply: () => {
      const startDate = todayIso();
      return {
        startDate,
        endDate: computeEndDateForDuration(startDate, 'weeks', 1),
        durationUnit: 'weeks',
        durationWeeks: 1,
        durationDays: undefined,
      };
    },
  },
  {
    id: 'today-2w',
    label: 'Hoy · 2 semanas',
    hint: '2 semanas desde hoy',
    apply: () => {
      const startDate = todayIso();
      return {
        startDate,
        endDate: computeEndDateForDuration(startDate, 'weeks', 2),
        durationUnit: 'weeks',
        durationWeeks: 2,
        durationDays: undefined,
      };
    },
  },
  {
    id: 'tomorrow-2w',
    label: 'Mañana · 2 semanas',
    hint: 'Empieza mañana',
    apply: () => {
      const startDate = addDays(todayIso(), 1);
      return {
        startDate,
        endDate: computeEndDateForDuration(startDate, 'weeks', 2),
        durationUnit: 'weeks',
        durationWeeks: 2,
        durationDays: undefined,
      };
    },
  },
  {
    id: 'keep',
    label: 'Mantener fechas',
    hint: 'Las planificadas',
    apply: (sprint) => ({
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      durationUnit: sprint.durationUnit,
      durationWeeks: sprint.durationWeeks,
      durationDays: sprint.durationDays,
    }),
  },
];

export function StartSprintModal({
  open,
  sprint,
  plan,
  busy = false,
  onClose,
  onConfirm,
}: StartSprintModalProps) {
  const sprintIndex = plan.sprints.findIndex((s) => s.id === sprint.id);
  const [goalDraft, setGoalDraft] = useState(sprint.sprintGoal);
  const [draftSprint, setDraftSprint] = useState(sprint);
  const [draftSprints, setDraftSprints] = useState(plan.sprints);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setGoalDraft(sprint.sprintGoal);
    setDraftSprint(sprint);
    setDraftSprints(plan.sprints);
    setActivePreset(null);
  }, [open, sprint, plan.sprints]);

  const applyPatch = (patch: SprintDatePatch) => {
    if (sprintIndex < 0) return;
    const nextSprints = applySprintDatePatch(
      draftSprints,
      draftSprint.id,
      patch,
      plan.config.sprintDurationWeeks
    );
    setDraftSprints(nextSprints);
    const next = nextSprints[sprintIndex];
    if (next) setDraftSprint(next);
    setActivePreset(null);
  };

  const applyPreset = (preset: DurationPreset) => {
    const patch = preset.apply(sprint);
    if (sprintIndex < 0) return;
    const nextSprints = applySprintDatePatch(
      plan.sprints,
      sprint.id,
      patch,
      plan.config.sprintDurationWeeks
    );
    setDraftSprints(nextSprints);
    const next = nextSprints[sprintIndex];
    if (next) setDraftSprint(next);
    setActivePreset(preset.id);
  };

  const datesUnchanged =
    draftSprint.startDate === sprint.startDate &&
    draftSprint.endDate === sprint.endDate &&
    draftSprint.durationUnit === sprint.durationUnit &&
    draftSprint.durationWeeks === sprint.durationWeeks &&
    draftSprint.durationDays === sprint.durationDays;

  const goalTrimmed = goalDraft.trim();
  const canConfirm = goalTrimmed.length > 0 && !busy && sprintIndex >= 0;

  const summary = useMemo(
    () => formatDateRangeEs(draftSprint.startDate, draftSprint.endDate),
    [draftSprint.startDate, draftSprint.endDate]
  );

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm({
      sprintId: sprint.id,
      goal: goalTrimmed,
      dates: {
        startDate: draftSprint.startDate,
        endDate: draftSprint.endDate,
        durationUnit: draftSprint.durationUnit,
        durationWeeks: draftSprint.durationWeeks,
        durationDays: draftSprint.durationDays,
      },
    });
  };

  return (
    <DetailModal
      open={open}
      onClose={busy ? () => undefined : onClose}
      eyebrow="Ciclo de sprint"
      subtitle={`Sprint ${sprint.number}`}
      title="Preparar e iniciar sprint"
      maxWidth="md"
    >
      <div className="flex flex-col gap-5">
        <p className="text-[13px] leading-relaxed text-muted">
          Revisa o ajusta las fechas antes de iniciar. El sprint no arranca solo por la fecha:
          solo queda activo cuando confirmes.
        </p>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-foreground">Sprint Goal</span>
          <textarea
            value={goalDraft}
            onChange={(e) => setGoalDraft(e.target.value)}
            rows={2}
            disabled={busy}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-border-strong focus:outline-none disabled:opacity-50"
            placeholder="Objetivo del sprint..."
          />
        </label>

        <div>
          <p className="mb-2 text-xs font-semibold text-foreground">Inicio rápido</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const selected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={busy}
                  onClick={() => applyPreset(preset)}
                  title={preset.hint}
                  className={[
                    'rounded-lg border px-3 py-1.5 text-left text-[12px] font-medium transition-colors cursor-pointer',
                    selected
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-foreground hover:bg-surface-hover',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                  ].join(' ')}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <SprintDateEditor
          sprint={draftSprint}
          sprintIndex={sprintIndex >= 0 ? sprintIndex : 0}
          allSprints={draftSprints}
          defaultDurationWeeks={plan.config.sprintDurationWeeks}
          onChange={applyPatch}
          disabled={busy}
          variant="modal"
        />

        <div className="rounded-lg border border-border bg-surface-muted/30 px-3 py-2.5">
          <p className="text-[11px] text-subtle">Ventana del sprint</p>
          <p className="mt-0.5 text-[13px] font-medium tabular-nums text-foreground">{summary}</p>
          {!datesUnchanged ? (
            <p className="mt-1 text-[11px] text-muted">Las fechas se guardarán al iniciar.</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => void handleConfirm()}
            className="cursor-pointer rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Iniciando…' : 'Iniciar sprint'}
          </button>
        </div>
      </div>
    </DetailModal>
  );
}
