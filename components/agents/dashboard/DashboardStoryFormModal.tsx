'use client';

import { useEffect, useState } from 'react';
import { AcceptanceCriteriaEditor } from '@/components/agents/agent-2/AcceptanceCriteriaEditor';
import { CategorySelect } from '@/components/agents/agent-4/CategorySelect';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { DropdownSelect } from '@/components/ui/DropdownSelect';
import {
  BUG_SEVERITY_LABELS,
  WORK_ITEM_TYPE_LABELS,
} from '@/lib/constants/agent-2';
import { FIBONACCI_SCALE } from '@/lib/constants/agent-3';
import { TimeDurationInput } from '@/components/agents/shared/TimeDurationInput';
import type { EstimationMode } from '@/lib/types/agent-3';
import { defaultDurationLabel, tryParseDurationLabel } from '@/lib/utils/estimation';
import type { CreateDashboardUserStoryInput } from '@/context/WorkspaceContext';
import type { BugSeverity, Epic, WorkItemType } from '@/lib/types/agent-2';
import type {
  FrameworkCategory,
  PrioritizationFramework,
  StoryPrioritization,
} from '@/lib/types/agent-4';

const ALLOWED_STORY_POINTS = FIBONACCI_SCALE;

const fieldLabelClass = 'text-[12px] font-medium text-muted';
const fieldControlClass =
  'mt-1.5 w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong';
const fieldSelectClass = 'mt-1.5 w-full';

interface SprintOption {
  id: string;
  label: string;
}

interface DashboardCreateStoryModalProps {
  open: boolean;
  onClose: () => void;
  epics: Epic[];
  framework: PrioritizationFramework | null;
  sprintOptions: SprintOption[];
  estimationMode?: EstimationMode;
  onCreate: (input: CreateDashboardUserStoryInput) => Promise<void>;
}

export function DashboardCreateStoryModal({
  open,
  onClose,
  epics,
  framework,
  sprintOptions,
  estimationMode = 'story_points',
  onCreate,
}: DashboardCreateStoryModalProps) {
  const [workItemType, setWorkItemType] = useState<WorkItemType>('story');
  const [epicId, setEpicId] = useState(epics[0]?.id ?? '');
  const [sprintId, setSprintId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState<string[]>([]);
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [steps, setSteps] = useState<string[]>([]);
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [points, setPoints] = useState(String(ALLOWED_STORY_POINTS[0]));
  const [durationLabel, setDurationLabel] = useState(defaultDurationLabel('story'));
  const [category, setCategory] = useState<FrameworkCategory | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWorkItemType('story');
    setEpicId(epics[0]?.id ?? '');
    setSprintId('');
    setTitle('');
    setDescription('');
    setCriteria([]);
    setSeverity('medium');
    setSteps([]);
    setTechnicalNotes('');
    setPoints(String(ALLOWED_STORY_POINTS[0]));
    setDurationLabel(defaultDurationLabel('story'));
    setCategory('');
    setIsSaving(false);
  }, [open, epics]);

  useEffect(() => {
    if (workItemType === 'bug') {
      setPoints('1');
      setDurationLabel(defaultDurationLabel('bug'));
    }
  }, [workItemType]);

  const storyCriteriaOk =
    workItemType !== 'story' || criteria.some((c) => c.trim());
  const bugStepsOk =
    workItemType !== 'bug' || steps.some((s) => s.trim());
  const isSaveDisabled =
    !epicId ||
    !title.trim() ||
    !description.trim() ||
    !storyCriteriaOk ||
    !bugStepsOk ||
    (estimationMode === 'time' && !tryParseDurationLabel(durationLabel)) ||
    isSaving;

  const typeLabel = WORK_ITEM_TYPE_LABELS[workItemType];

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      eyebrow="Plan de sprints"
      title={`Nuevo · ${typeLabel}`}
      subtitle="Manual"
      maxWidth="xl"
    >
      <p className="mb-4 text-[13px] text-muted">
        Se crea como ítem manual y queda sincronizado con el backlog y el plan.
      </p>

      <StoryFormFields
        epics={epics}
        framework={framework}
        sprintOptions={sprintOptions}
        workItemType={workItemType}
        typeEditable
        epicId={epicId}
        sprintId={sprintId}
        title={title}
        description={description}
        criteria={criteria}
        severity={severity}
        steps={steps}
        technicalNotes={technicalNotes}
        points={points}
        durationLabel={durationLabel}
        estimationMode={estimationMode}
        category={category}
        onWorkItemTypeChange={setWorkItemType}
        onEpicIdChange={setEpicId}
        onSprintIdChange={setSprintId}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onCriteriaChange={setCriteria}
        onSeverityChange={setSeverity}
        onStepsChange={setSteps}
        onTechnicalNotesChange={setTechnicalNotes}
        onPointsChange={setPoints}
        onDurationChange={setDurationLabel}
        onCategoryChange={setCategory}
      />

      <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isSaveDisabled}
          onClick={async () => {
            if (isSaveDisabled) return;
            setIsSaving(true);
            try {
              await onCreate({
                epicId,
                sprintId: sprintId || null,
                type: workItemType,
                title: title.trim(),
                description: description.trim(),
                acceptanceCriteria: workItemType === 'story' ? criteria : criteria.filter((c) => c.trim()),
                points: estimationMode === 'story_points' ? Number(points) : undefined,
                durationLabel: estimationMode === 'time' ? durationLabel : undefined,
                ...(category ? { category } : {}),
                ...(workItemType === 'bug'
                  ? { severity, stepsToReproduce: steps }
                  : {}),
                ...(workItemType === 'task' && technicalNotes.trim()
                  ? { technicalNotes: technicalNotes.trim() }
                  : {}),
              });
            } finally {
              setIsSaving(false);
            }
          }}
          className={[
            'cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-opacity',
            isSaveDisabled
              ? 'cursor-not-allowed bg-disabled text-disabled-text opacity-40'
              : 'bg-foreground text-background hover:opacity-90',
          ].join(' ')}
        >
          {isSaving ? 'Creando…' : `Crear ${typeLabel.toLowerCase()}`}
        </button>
      </div>
    </DetailModal>
  );
}

function StoryFormFields({
  epics,
  framework,
  sprintOptions,
  sprintDisabled = false,
  workItemType,
  typeEditable,
  epicId,
  sprintId,
  title,
  description,
  criteria,
  severity,
  steps,
  technicalNotes,
  points,
  durationLabel,
  estimationMode = 'story_points',
  category,
  onWorkItemTypeChange,
  onEpicIdChange,
  onSprintIdChange,
  onTitleChange,
  onDescriptionChange,
  onCriteriaChange,
  onSeverityChange,
  onStepsChange,
  onTechnicalNotesChange,
  onPointsChange,
  onDurationChange,
  onCategoryChange,
}: {
  epics: Epic[];
  framework: PrioritizationFramework | null;
  sprintOptions: SprintOption[];
  sprintDisabled?: boolean;
  workItemType: WorkItemType;
  typeEditable: boolean;
  epicId: string;
  sprintId: string;
  title: string;
  description: string;
  criteria: string[];
  severity: BugSeverity;
  steps: string[];
  technicalNotes: string;
  points: string;
  durationLabel: string;
  estimationMode?: EstimationMode;
  category: FrameworkCategory | '';
  onWorkItemTypeChange?: (value: WorkItemType) => void;
  onEpicIdChange: (value: string) => void;
  onSprintIdChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCriteriaChange: (value: string[]) => void;
  onSeverityChange: (value: BugSeverity) => void;
  onStepsChange: (value: string[]) => void;
  onTechnicalNotesChange: (value: string) => void;
  onPointsChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onCategoryChange: (value: FrameworkCategory | '') => void;
}) {
  const descriptionPlaceholder =
    workItemType === 'bug'
      ? 'Describe el fallo observado…'
      : workItemType === 'task'
        ? 'Describe el trabajo técnico…'
        : 'Como usuario, quiero…';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {typeEditable && onWorkItemTypeChange ? (
          <label className={fieldLabelClass}>
            Tipo
            <DropdownSelect
              value={workItemType}
              onChange={(value) => onWorkItemTypeChange(value as WorkItemType)}
              options={[
                { value: 'story', label: WORK_ITEM_TYPE_LABELS.story },
                { value: 'bug', label: WORK_ITEM_TYPE_LABELS.bug },
                { value: 'task', label: WORK_ITEM_TYPE_LABELS.task },
              ]}
              placeholder="Tipo"
              className={fieldSelectClass}
            />
          </label>
        ) : null}
        <label className={fieldLabelClass}>
          Épica
          <DropdownSelect
            value={epicId}
            onChange={onEpicIdChange}
            options={epics.map((epic) => ({
              value: epic.id,
              label: epic.title,
            }))}
            placeholder="Selecciona una épica"
            className={fieldSelectClass}
          />
        </label>
        <label className={fieldLabelClass}>
          Sprint
          <DropdownSelect
            value={sprintId}
            onChange={onSprintIdChange}
            options={[
              { value: '', label: 'Sin sprint' },
              ...sprintOptions.map((sprint) => ({
                value: sprint.id,
                label: sprint.label,
              })),
            ]}
            placeholder="Sin sprint"
            className={fieldSelectClass}
            disabled={sprintDisabled}
          />
          {sprintDisabled ? (
            <span className="mt-1 block text-[11px] text-muted">
              No se puede mover: el sprint está cerrado.
            </span>
          ) : null}
        </label>
        <label className={fieldLabelClass}>
          {estimationMode === 'time' ? 'Tiempo' : 'Story points'}
          {estimationMode === 'time' ? (
            <div className="mt-1.5">
              <TimeDurationInput
                value={durationLabel}
                onCommit={(label) => onDurationChange(label)}
              />
            </div>
          ) : (
            <DropdownSelect
              value={points}
              onChange={onPointsChange}
              options={ALLOWED_STORY_POINTS.map((value) => ({
                value: String(value),
                label: String(value),
              }))}
              placeholder="SP"
              className={fieldSelectClass}
            />
          )}
        </label>
        <label className={`min-w-0 ${fieldLabelClass}`}>
          Prioridad
          {framework ? (
            <div className="mt-1.5 min-w-0">
              <CategorySelect
                framework={framework}
                value={category}
                onChange={onCategoryChange}
                className="w-full"
              />
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-subtle">
              Disponible tras priorizar (Agente 4)
            </p>
          )}
        </label>
        {workItemType === 'bug' ? (
          <label className={fieldLabelClass}>
            Severidad
            <DropdownSelect
              value={severity}
              onChange={(value) => onSeverityChange(value as BugSeverity)}
              options={(Object.keys(BUG_SEVERITY_LABELS) as BugSeverity[]).map(
                (key) => ({
                  value: key,
                  label: BUG_SEVERITY_LABELS[key],
                })
              )}
              placeholder="Severidad"
              className={fieldSelectClass}
            />
          </label>
        ) : null}
      </div>

      <label className={fieldLabelClass}>
        Título
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={`Título del ${WORK_ITEM_TYPE_LABELS[workItemType].toLowerCase()}…`}
          className={`${fieldControlClass} font-medium`}
        />
      </label>

      <label className={fieldLabelClass}>
        Descripción
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={4}
          placeholder={descriptionPlaceholder}
          className={`${fieldControlClass} resize-none`}
        />
      </label>

      {workItemType === 'bug' ? (
        <div>
          <p className={`${fieldLabelClass} mb-1.5`}>Pasos para reproducir</p>
          <AcceptanceCriteriaEditor
            criteria={steps}
            onChange={onStepsChange}
            disabled={false}
            itemLabel="pasos"
            addButtonLabel="Añadir paso"
          />
        </div>
      ) : null}

      {workItemType === 'task' ? (
        <label className={fieldLabelClass}>
          Notas técnicas
          <textarea
            value={technicalNotes}
            onChange={(event) => onTechnicalNotesChange(event.target.value)}
            rows={3}
            placeholder="Detalles técnicos opcionales…"
            className={`${fieldControlClass} resize-none`}
          />
        </label>
      ) : null}

      {workItemType === 'story' || workItemType === 'task' ? (
        <div>
          {workItemType === 'task' ? (
            <p className={`${fieldLabelClass} mb-1.5`}>
              Criterios de aceptación (opcional)
            </p>
          ) : null}
          <AcceptanceCriteriaEditor
            criteria={criteria}
            onChange={onCriteriaChange}
            disabled={false}
          />
        </div>
      ) : null}

      {workItemType === 'bug' ? (
        <div>
          <p className={`${fieldLabelClass} mb-1.5`}>
            Criterios de aceptación (opcional)
          </p>
          <AcceptanceCriteriaEditor
            criteria={criteria}
            onChange={onCriteriaChange}
            disabled={false}
          />
        </div>
      ) : null}
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
