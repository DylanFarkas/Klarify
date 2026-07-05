'use client';

import { useEffect, useState } from 'react';
import type { PlannedSprint, SprintDatePatch } from '@/lib/types/agent-5';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { SprintDateEditor } from './SprintDateEditor';

interface SprintEditModalProps {
  open: boolean;
  onClose: () => void;
  sprint: PlannedSprint;
  sprintIndex: number;
  allSprints: PlannedSprint[];
  defaultDurationWeeks: number;
  onGoalChange: (goal: string) => void;
  onDatesChange: (patch: SprintDatePatch) => void;
}

export function SprintEditModal({
  open,
  onClose,
  sprint,
  sprintIndex,
  allSprints,
  defaultDurationWeeks,
  onGoalChange,
  onDatesChange,
}: SprintEditModalProps) {
  const [goalDraft, setGoalDraft] = useState(sprint.sprintGoal);

  useEffect(() => {
    if (open) setGoalDraft(sprint.sprintGoal);
  }, [open, sprint.sprintGoal]);

  const handleClose = () => {
    const trimmed = goalDraft.trim();
    if (trimmed && trimmed !== sprint.sprintGoal) {
      onGoalChange(trimmed);
    }
    onClose();
  };

  return (
    <DetailModal
      open={open}
      onClose={handleClose}
      eyebrow="Planificación de sprint"
      subtitle={`Sprint ${sprint.number}`}
      title="Editar sprint"
      maxWidth="md"
    >
      <div className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-foreground">Sprint Goal</span>
          <textarea
            value={goalDraft}
            onChange={(e) => setGoalDraft(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
            placeholder="Objetivo del sprint..."
          />
        </label>

        <SprintDateEditor
          sprint={sprint}
          sprintIndex={sprintIndex}
          allSprints={allSprints}
          defaultDurationWeeks={defaultDurationWeeks}
          onChange={onDatesChange}
          variant="modal"
        />

        <p className="text-[11px] leading-relaxed text-muted">
          Los cambios en fechas se aplican al instante. Los sprints posteriores se ajustan automáticamente para evitar solapamientos.
        </p>
      </div>
    </DetailModal>
  );
}