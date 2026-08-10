'use client';

import { useEffect, useState } from 'react';
import { AcceptanceCriteriaEditor } from '@/components/agents/agent-2/AcceptanceCriteriaEditor';
import { CategorySelect } from '@/components/agents/agent-4/CategorySelect';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { DropdownSelect } from '@/components/ui/DropdownSelect';
import { FIBONACCI_SCALE } from '@/lib/constants/agent-3';
import type { CreateDashboardUserStoryInput, UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type {
	FrameworkCategory,
	PrioritizationFramework,
	StoryPrioritization,
} from '@/lib/types/agent-4';
import type { DashboardSprintStoryRow } from './dashboardMetrics';

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
	onCreate: (input: CreateDashboardUserStoryInput) => Promise<void>;
}

export function DashboardCreateStoryModal({
	open,
	onClose,
	epics,
	framework,
	sprintOptions,
	onCreate,
}: DashboardCreateStoryModalProps) {
	const [epicId, setEpicId] = useState(epics[0]?.id ?? '');
	const [sprintId, setSprintId] = useState('');
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [criteria, setCriteria] = useState<string[]>([]);
	const [points, setPoints] = useState(String(ALLOWED_STORY_POINTS[0]));
	const [category, setCategory] = useState<FrameworkCategory | ''>('');
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setEpicId(epics[0]?.id ?? '');
		setSprintId('');
		setTitle('');
		setDescription('');
		setCriteria([]);
		setPoints(String(ALLOWED_STORY_POINTS[0]));
		setCategory('');
		setIsSaving(false);
	}, [open, epics]);

	const isSaveDisabled = !epicId || !title.trim() || !description.trim() || isSaving;

	return (
		<DetailModal
			open={open}
			onClose={onClose}
			eyebrow="Plan de sprints"
			title="Nueva historia"
			subtitle="Manual"
			maxWidth="xl"
		>
			<p className="mb-4 text-[13px] text-muted">
				Se crea como historia manual y queda sincronizada con el backlog y el plan.
			</p>

			<StoryFormFields
				epics={epics}
				framework={framework}
				sprintOptions={sprintOptions}
				epicId={epicId}
				sprintId={sprintId}
				title={title}
				description={description}
				criteria={criteria}
				points={points}
				category={category}
				onEpicIdChange={setEpicId}
				onSprintIdChange={setSprintId}
				onTitleChange={setTitle}
				onDescriptionChange={setDescription}
				onCriteriaChange={setCriteria}
				onPointsChange={setPoints}
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
								title: title.trim(),
								description: description.trim(),
								acceptanceCriteria: criteria,
								points: Number(points),
								...(category ? { category } : {}),
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
					{isSaving ? 'Creando…' : 'Crear HU'}
				</button>
			</div>
		</DetailModal>
	);
}

interface DashboardEditStoryModalProps {
	open: boolean;
	onClose: () => void;
	row: DashboardSprintStoryRow;
	epics: Epic[];
	framework: PrioritizationFramework | null;
	sprintOptions: SprintOption[];
	onSave: (
		updates: Partial<UserStory>,
		estimationUpdates?: Partial<StoryEstimation>,
		options?: UpdateDashboardUserStoryOptions,
		prioritizationUpdates?: Partial<StoryPrioritization>
	) => Promise<void>;
}

export function DashboardEditStoryModal({
	open,
	onClose,
	row,
	epics,
	framework,
	sprintOptions,
	onSave,
}: DashboardEditStoryModalProps) {
	const [title, setTitle] = useState(row.story.title);
	const [description, setDescription] = useState(row.story.description);
	const [criteria, setCriteria] = useState(row.story.acceptanceCriteria);
	const [epicId, setEpicId] = useState(row.epicId);
	const [sprintId, setSprintId] = useState(row.sprintId ?? '');
	const initialPoints = row.estimation?.points ?? 1;
	const [points, setPoints] = useState(
		String(isAllowedStoryPoint(initialPoints) ? initialPoints : 1)
	);
	const [category, setCategory] = useState<FrameworkCategory | ''>(
		row.prioritization?.category ?? ''
	);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setTitle(row.story.title);
		setDescription(row.story.description);
		setCriteria(row.story.acceptanceCriteria);
		setEpicId(row.epicId);
		setSprintId(row.sprintId ?? '');
		const pts = row.estimation?.points ?? 1;
		setPoints(String(isAllowedStoryPoint(pts) ? pts : 1));
		setCategory(row.prioritization?.category ?? '');
		setIsSaving(false);
	}, [open, row]);

	const parsedPoints = Number(points);
	const isInvalidPoints = !isAllowedStoryPoint(parsedPoints);
	const isSaveDisabled = !title.trim() || !description.trim() || !epicId || isInvalidPoints || isSaving;
	const hasEpicChange = epicId !== row.epicId;
	const hasSprintChange = (sprintId || null) !== row.sprintId;
	const hasPriorityChange = framework ? category !== (row.prioritization?.category ?? '') : false;

	return (
		<DetailModal
			open={open}
			onClose={onClose}
			eyebrow="Editar historia"
			subtitle={row.story.id}
			title={row.story.title}
			maxWidth="xl"
		>
			<StoryFormFields
				epics={epics}
				framework={framework}
				sprintOptions={sprintOptions}
				epicId={epicId}
				sprintId={sprintId}
				title={title}
				description={description}
				criteria={criteria}
				points={points}
				category={category}
				onEpicIdChange={setEpicId}
				onSprintIdChange={setSprintId}
				onTitleChange={setTitle}
				onDescriptionChange={setDescription}
				onCriteriaChange={setCriteria}
				onPointsChange={setPoints}
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
							await onSave(
								{
									title: title.trim(),
									description: description.trim(),
									acceptanceCriteria: criteria,
								},
								{
									points: parsedPoints,
									justification:
										row.estimation?.justification ||
										'Estimacion ajustada manualmente desde el dashboard.',
									isModified: true,
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
					{isSaving ? 'Guardando…' : 'Guardar cambios'}
				</button>
			</div>
		</DetailModal>
	);
}

function StoryFormFields({
	epics,
	framework,
	sprintOptions,
	epicId,
	sprintId,
	title,
	description,
	criteria,
	points,
	category,
	onEpicIdChange,
	onSprintIdChange,
	onTitleChange,
	onDescriptionChange,
	onCriteriaChange,
	onPointsChange,
	onCategoryChange,
}: {
	epics: Epic[];
	framework: PrioritizationFramework | null;
	sprintOptions: SprintOption[];
	epicId: string;
	sprintId: string;
	title: string;
	description: string;
	criteria: string[];
	points: string;
	category: FrameworkCategory | '';
	onEpicIdChange: (value: string) => void;
	onSprintIdChange: (value: string) => void;
	onTitleChange: (value: string) => void;
	onDescriptionChange: (value: string) => void;
	onCriteriaChange: (value: string[]) => void;
	onPointsChange: (value: string) => void;
	onCategoryChange: (value: FrameworkCategory | '') => void;
}) {
	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-3 sm:grid-cols-2">
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
					/>
				</label>
				<label className={fieldLabelClass}>
					Story points
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
						<p className="mt-2 text-[12px] text-subtle">Disponible tras priorizar (Agente 4)</p>
					)}
				</label>
			</div>

			<label className={fieldLabelClass}>
				Título
				<input
					value={title}
					onChange={(event) => onTitleChange(event.target.value)}
					placeholder="Título de la historia…"
					className={`${fieldControlClass} font-medium`}
				/>
			</label>

			<label className={fieldLabelClass}>
				Descripción
				<textarea
					value={description}
					onChange={(event) => onDescriptionChange(event.target.value)}
					rows={4}
					placeholder="Como usuario, quiero…"
					className={`${fieldControlClass} resize-none`}
				/>
			</label>

			<div>
				<AcceptanceCriteriaEditor criteria={criteria} onChange={onCriteriaChange} disabled={false} />
			</div>
		</div>
	);
}

function isAllowedStoryPoint(value: number): value is (typeof ALLOWED_STORY_POINTS)[number] {
	return ALLOWED_STORY_POINTS.includes(value as (typeof ALLOWED_STORY_POINTS)[number]);
}
