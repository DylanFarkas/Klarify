'use client';

import { useEffect, useRef, useState } from 'react';
import { AcceptanceCriteriaEditor } from '@/components/agents/agent-2/AcceptanceCriteriaEditor';
import { SubtasksEditor } from '@/components/agents/shared/SubtasksEditor';
import { CategorySelect } from '@/components/agents/agent-4/CategorySelect';
import {
  WorkItemTypeBadge,
} from '@/components/agents/shared/WorkItemTypeBadge';
import { DropdownSelect } from '@/components/ui/DropdownSelect';
import { TimeDurationInput } from '@/components/agents/shared/TimeDurationInput';
import { ExecutionStatusBadge, ExecutionStatusSelect } from '@/components/agents/dashboard/ExecutionStatusBadge';
import { AssigneeAvatarStatic, AssigneeSelect } from '@/components/agents/dashboard/AssigneeSelect';
import {
  BUG_SEVERITY_LABELS,
  WORK_ITEM_TYPE_LABELS,
} from '@/lib/constants/agent-2';
import { FIBONACCI_SCALE } from '@/lib/constants/agent-3';
import type { EstimationMode } from '@/lib/types/agent-3';
import { defaultDurationLabel, tryParseDurationLabel } from '@/lib/utils/estimation';
import type { UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import type { BugSeverity, Epic, StorySubtask, UserStory, WorkItemType } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type {
  FrameworkCategory,
  PrioritizationFramework,
  StoryPrioritization,
} from '@/lib/types/agent-4';
import type { KanbanStatus, ProjectMember } from '@/lib/types/execution';
import { resolveWorkItemType } from '@/lib/utils/work-item-validation';
import type { SprintOption } from '@/lib/utils/backlog-story-navigation';
import type { DashboardSprintStoryRow } from './dashboardMetrics';
import { notifySuccess } from '@/lib/notifications/toast';

const ALLOWED_STORY_POINTS = FIBONACCI_SCALE;

const fieldLabelClass = 'text-[12px] font-medium text-muted';
const fieldControlClass =
  'mt-1.5 w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong';

const TYPE_DOT_CLASS: Record<WorkItemType, string> = {
  story: 'bg-primary',
  bug: 'bg-red-500',
  task: 'bg-sky-500',
};

interface DashboardStoryEditFormProps {
  row: DashboardSprintStoryRow;
  epics: Epic[];
  framework: PrioritizationFramework | null;
  sprintOptions: SprintOption[];
  sprintAssignmentLocked?: boolean;
  estimationMode?: EstimationMode;
  members?: ProjectMember[];
  canEditStatus?: boolean;
  onSave: (
    updates: Partial<UserStory>,
    estimationUpdates?: Partial<StoryEstimation>,
    options?: UpdateDashboardUserStoryOptions,
    prioritizationUpdates?: Partial<StoryPrioritization>
  ) => Promise<void>;
  onUpdateStoryStatus?: (storyId: string, status: KanbanStatus) => Promise<void>;
  onUpdateStoryAssignee?: (storyId: string, assigneeId: string | null) => Promise<void>;
  onCancel?: () => void;
}

export function DashboardStoryEditForm({
  row,
  epics,
  framework,
  sprintOptions,
  sprintAssignmentLocked = false,
  estimationMode = 'story_points',
  members = [],
  canEditStatus = false,
  onSave,
  onUpdateStoryStatus,
  onUpdateStoryAssignee,
  onCancel,
}: DashboardStoryEditFormProps) {
  const workItemType = resolveWorkItemType(row.story);
  const [title, setTitle] = useState(row.story.title);
  const [description, setDescription] = useState(row.story.description);
  const [criteria, setCriteria] = useState(row.story.acceptanceCriteria);
  const [subtasks, setSubtasks] = useState<StorySubtask[]>(row.story.subtasks ?? []);
  const [severity, setSeverity] = useState<BugSeverity>(row.story.severity ?? 'medium');
  const [steps, setSteps] = useState(row.story.stepsToReproduce ?? []);
  const [technicalNotes, setTechnicalNotes] = useState(row.story.technicalNotes ?? '');
  const [epicId, setEpicId] = useState(row.epicId);
  const [sprintId, setSprintId] = useState(row.sprintId ?? '');
  const initialPoints = row.estimation?.points ?? 1;
  const [points, setPoints] = useState(
    String(isAllowedStoryPoint(initialPoints) ? initialPoints : 1)
  );
  const [durationLabel, setDurationLabel] = useState(
    row.estimation?.durationLabel ?? defaultDurationLabel(workItemType)
  );
  const [category, setCategory] = useState<FrameworkCategory | ''>(
    row.prioritization?.category ?? ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const assignee = members.find((member) => member.id === row.assigneeId) ?? null;

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    setTitle(row.story.title);
    setDescription(row.story.description);
    setCriteria(row.story.acceptanceCriteria);
    setSubtasks(row.story.subtasks ?? []);
    setSeverity(row.story.severity ?? 'medium');
    setSteps(row.story.stepsToReproduce ?? []);
    setTechnicalNotes(row.story.technicalNotes ?? '');
    setEpicId(row.epicId);
    setSprintId(row.sprintId ?? '');
    const pts = row.estimation?.points ?? 1;
    setPoints(String(isAllowedStoryPoint(pts) ? pts : 1));
    setDurationLabel(row.estimation?.durationLabel ?? defaultDurationLabel(workItemType));
    setCategory(row.prioritization?.category ?? '');
    setIsSaving(false);
    setIsSavingMeta(false);
  }, [row, workItemType]);

  const parsedPoints = Number(points);
  const isInvalidPoints =
    estimationMode === 'story_points' && !isAllowedStoryPoint(parsedPoints);
  const isInvalidDuration =
    estimationMode === 'time' && !tryParseDurationLabel(durationLabel);
  const storyCriteriaOk =
    workItemType !== 'story' || criteria.some((c) => c.trim());
  const bugStepsOk = workItemType !== 'bug' || steps.some((s) => s.trim());
  const isSaveDisabled =
    !title.trim() ||
    !description.trim() ||
    !epicId ||
    isInvalidPoints ||
    isInvalidDuration ||
    !storyCriteriaOk ||
    !bugStepsOk ||
    isSaving;
  const hasEpicChange = epicId !== row.epicId;
  const hasSprintChange =
    !sprintAssignmentLocked && (sprintId || null) !== row.sprintId;
  const hasPriorityChange = framework
    ? category !== (row.prioritization?.category ?? '')
    : false;

  const descriptionPlaceholder =
    workItemType === 'bug'
      ? 'Describe el fallo observado…'
      : workItemType === 'task'
        ? 'Describe el trabajo técnico…'
        : 'Como usuario, quiero…';

  const handleSave = async () => {
    if (isSaveDisabled) return;
    setIsSaving(true);
    try {
      const updates: Partial<UserStory> = {
        title: title.trim(),
        description: description.trim(),
        acceptanceCriteria: criteria,
        subtasks,
      };
      if (workItemType === 'bug') {
        updates.severity = severity;
        updates.stepsToReproduce = steps;
      }
      if (workItemType === 'task') {
        updates.technicalNotes = technicalNotes.trim();
      }
      await onSave(
        updates,
        {
          ...(estimationMode === 'time'
            ? {
                points: 0,
                durationLabel,
                justification:
                  row.estimation?.justification ||
                  'Estimacion ajustada manualmente desde el dashboard.',
                isModified: true,
              }
            : {
                points: parsedPoints,
                justification:
                  row.estimation?.justification ||
                  'Estimacion ajustada manualmente desde el dashboard.',
                isModified: true,
              }),
        },
        {
          ...(hasEpicChange ? { epicId } : {}),
          ...(hasSprintChange ? { sprintId: sprintId || null } : {}),
        },
        framework && hasPriorityChange && category
          ? {
              category,
              justification:
                row.prioritization?.justification ||
                'Priorizacion ajustada manualmente desde el dashboard.',
              isModified: true,
            }
          : undefined
      );
      notifySuccess('HU actualizada');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
          <div className="mb-4 lg:hidden">
            <WorkItemTypeBadge type={workItemType} />
          </div>

          <label className="sr-only" htmlFor="story-edit-title">
            Título
          </label>
          <textarea
            ref={titleRef}
            id="story-edit-title"
            value={title}
            rows={1}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
            placeholder="Título de la historia…"
            className="w-full resize-none overflow-hidden border-0 bg-transparent text-2xl font-semibold leading-tight wrap-break-word text-foreground outline-none placeholder:text-placeholder focus:ring-0 md:text-[50px]"
          />

          <div className="mt-8">
            <p className={`${fieldLabelClass} mb-2`}>Descripción</p>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              placeholder={descriptionPlaceholder}
              className={`${fieldControlClass} min-h-35 resize-y leading-relaxed`}
            />
          </div>

          {workItemType === 'bug' ? (
            <div className="mt-8">
              <p className={`${fieldLabelClass} mb-2`}>Pasos para reproducir</p>
              <AcceptanceCriteriaEditor
                criteria={steps}
                onChange={setSteps}
                disabled={false}
                itemLabel="pasos"
                addButtonLabel="Añadir paso"
              />
            </div>
          ) : null}

          {workItemType === 'task' ? (
            <div className="mt-8">
              <p className={`${fieldLabelClass} mb-2`}>Notas técnicas</p>
              <textarea
                value={technicalNotes}
                onChange={(event) => setTechnicalNotes(event.target.value)}
                rows={4}
                placeholder="Detalles técnicos opcionales…"
                className={`${fieldControlClass} resize-y`}
              />
            </div>
          ) : null}

          {workItemType === 'story' || workItemType === 'task' || workItemType === 'bug' ? (
            <div className="mt-8">
              <p className={`${fieldLabelClass} mb-2`}>
                {workItemType === 'story'
                  ? 'Criterios de aceptación'
                  : 'Criterios de aceptación (opcional)'}
              </p>
              <AcceptanceCriteriaEditor
                criteria={criteria}
                onChange={setCriteria}
                disabled={false}
              />
            </div>
          ) : null}

          <div className="mt-8">
            <p className={`${fieldLabelClass} mb-2`}>Subtareas</p>
            <SubtasksEditor
              subtasks={subtasks}
              onChange={setSubtasks}
            />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-6">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancelar
              </button>
            ) : null}
            <button
              type="button"
              disabled={isSaveDisabled}
              onClick={handleSave}
              className={[
                'cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-opacity',
                isSaveDisabled
                  ? 'cursor-not-allowed bg-disabled text-disabled-text opacity-40'
                  : 'bg-foreground text-background hover:opacity-90',
              ].join(' ')}
            >
              {isSaving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      <aside className="shrink-0 border-t border-border lg:sticky lg:top-0 lg:w-72 lg:self-start lg:border-l lg:border-t-0">
        <div className="flex flex-col gap-7 px-5 py-6">
          <PropertySection title="Propiedades">
            <PropertyRow label="Tipo">
              <span className="inline-flex h-8 items-center gap-2 px-2 text-sm text-foreground">
                <span
                  className={`size-2 shrink-0 rounded-full ${TYPE_DOT_CLASS[workItemType] ?? 'bg-primary'}`}
                />
                {WORK_ITEM_TYPE_LABELS[workItemType]}
              </span>
            </PropertyRow>

            {canEditStatus ? (
              <PropertyRow label="Estado">
                {onUpdateStoryStatus ? (
                  <ExecutionStatusSelect
                    status={row.executionStatus}
                    disabled={isSavingMeta}
                    variant="ghost"
                    onChange={async (status) => {
                      if (status === row.executionStatus || isSavingMeta) return;
                      setIsSavingMeta(true);
                      try {
                        await onUpdateStoryStatus(row.story.id, status);
                      } finally {
                        setIsSavingMeta(false);
                      }
                    }}
                    aria-label={`Estado de ${row.story.id}`}
                  />
                ) : (
                  <ExecutionStatusBadge status={row.executionStatus} />
                )}
              </PropertyRow>
            ) : null}

            <PropertyRow label="Prioridad">
              {framework ? (
                <CategorySelect
                  framework={framework}
                  value={category}
                  onChange={setCategory}
                  className="w-full"
                  variant="ghost"
                />
              ) : (
                <span className="px-2 text-sm text-subtle">Sin priorizar</span>
              )}
            </PropertyRow>

            <PropertyRow label={estimationMode === 'time' ? 'Tiempo' : 'Estimación'}>
              {estimationMode === 'time' ? (
                <TimeDurationInput
                  value={durationLabel}
                  onCommit={(label) => setDurationLabel(label)}
                  variant="ghost"
                />
              ) : (
                <DropdownSelect
                  value={points}
                  onChange={setPoints}
                  options={ALLOWED_STORY_POINTS.map((value) => ({
                    value: String(value),
                    label: `${value} SP`,
                  }))}
                  placeholder="SP"
                  className="w-full"
                  variant="ghost"
                />
              )}
            </PropertyRow>

            {workItemType === 'bug' ? (
              <PropertyRow label="Severidad">
                <DropdownSelect
                  value={severity}
                  onChange={(value) => setSeverity(value as BugSeverity)}
                  options={(Object.keys(BUG_SEVERITY_LABELS) as BugSeverity[]).map((key) => ({
                    value: key,
                    label: BUG_SEVERITY_LABELS[key],
                  }))}
                  placeholder="Severidad"
                  className="w-full"
                  variant="ghost"
                />
              </PropertyRow>
            ) : null}

            {members.length > 0 ? (
              <PropertyRow label="Asignado">
                {onUpdateStoryAssignee ? (
                  <AssigneeSelect
                    assignee={assignee}
                    members={members}
                    disabled={isSavingMeta}
                    variant="row"
                    onChange={async (assigneeId) => {
                      if (assigneeId === row.assigneeId || isSavingMeta) return;
                      setIsSavingMeta(true);
                      try {
                        await onUpdateStoryAssignee(row.story.id, assigneeId);
                      } finally {
                        setIsSavingMeta(false);
                      }
                    }}
                    aria-label={`Responsable de ${row.story.id}`}
                  />
                ) : (
                  <span className="inline-flex h-8 items-center gap-2 px-2 text-sm text-foreground">
                    <AssigneeAvatarStatic assignee={assignee} />
                    {assignee?.displayName ?? 'Sin asignar'}
                  </span>
                )}
              </PropertyRow>
            ) : null}
          </PropertySection>

          <PropertySection title="Planificación">
            <PropertyRow label="Épica">
              <DropdownSelect
                value={epicId}
                onChange={setEpicId}
                options={epics.map((epic) => ({
                  value: epic.id,
                  label: epic.title,
                }))}
                placeholder="Selecciona una épica"
                className="w-full"
                variant="ghost"
              />
            </PropertyRow>

            <PropertyRow label="Sprint">
              <DropdownSelect
                value={sprintId}
                onChange={setSprintId}
                options={[
                  { value: '', label: 'Sin sprint' },
                  ...sprintOptions.map((sprint) => ({
                    value: sprint.id,
                    label: sprint.label,
                  })),
                ]}
                placeholder="Sin sprint"
                className="w-full"
                disabled={sprintAssignmentLocked}
                variant="ghost"
              />
            </PropertyRow>
            {sprintAssignmentLocked ? (
              <p className="pl-19 text-[11px] leading-relaxed text-muted">
                No se puede mover: el sprint está cerrado.
              </p>
            ) : null}
          </PropertySection>

          <p className="text-[11px] text-subtle">
            {row.story.source === 'auto' ? 'Generada por IA' : 'Creada manualmente'}
            {row.story.isEdited ? ' · Editada' : ''}
          </p>
        </div>
      </aside>
    </div>
  );
}

function PropertySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-medium text-muted">{title}</h3>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-8 items-center gap-2">
      <span className="w-18 shrink-0 text-xs text-muted">{label}</span>
      <div className="min-w-0 flex-1 -ml-1">{children}</div>
    </div>
  );
}

function isAllowedStoryPoint(
  value: number
): value is (typeof ALLOWED_STORY_POINTS)[number] {
  return ALLOWED_STORY_POINTS.includes(
    value as (typeof ALLOWED_STORY_POINTS)[number]
  );
}
