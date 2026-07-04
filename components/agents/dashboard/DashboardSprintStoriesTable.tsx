'use client';

import { useMemo, useState } from 'react';
import { AcceptanceCriteriaEditor } from '@/components/agents/agent-2/AcceptanceCriteriaEditor';
import { CategoryBadge } from '@/components/agents/agent-4/CategorySelect';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { ViewDetailsButton } from '@/components/agents/shared/ViewDetailsButton';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import type { DashboardSprintStoryRow } from './dashboardMetrics';

interface DashboardSprintStoriesTableProps {
	framework: PrioritizationFramework | null;
	rows: DashboardSprintStoryRow[];
	unassignedRows: DashboardSprintStoryRow[];
	onEditStory: (
		storyId: string,
		updates: Partial<UserStory>,
		estimationUpdates?: Partial<StoryEstimation>
	) => Promise<void>;
}

export function DashboardSprintStoriesTable({
	framework,
	rows,
	unassignedRows,
	onEditStory,
}: DashboardSprintStoriesTableProps) {
	const [detailRow, setDetailRow] = useState<DashboardSprintStoryRow | null>(null);
	const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
	const groupedRows = useMemo(() => groupRowsBySprint(rows), [rows]);
	const hasRows = rows.length > 0 || unassignedRows.length > 0;

	return (
		<section className="rounded-2xl border border-border bg-surface/80 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
				<div>
					<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Plan de sprints</p>
					<h2 className="mt-2 text-xl font-bold text-foreground">Sprints e historias de usuario</h2>
					<p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
						Consulta que HU vive en cada sprint, revisa su detalle y ajusta titulo, descripcion o criterios cuando haga falta.
					</p>
				</div>
				<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-right">
					<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">HU planificadas</p>
					<p className="mt-1 text-2xl font-bold text-foreground">{rows.length}</p>
				</div>
			</div>

			{hasRows ? (
				<div className="overflow-x-auto">
					<table className="w-full min-w-[980px] border-collapse text-left">
						<thead className="border-b border-border bg-surface-muted/60">
							<tr className="text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">
								<th className="px-6 py-3">Sprint</th>
								<th className="px-4 py-3">HU</th>
								<th className="px-4 py-3">Epica</th>
								<th className="px-4 py-3">SP</th>
								<th className="px-4 py-3">Prioridad</th>
								<th className="px-4 py-3 text-right">Acciones</th>
							</tr>
						</thead>
						<tbody>
							{groupedRows.map((group) => (
								<SprintGroupRows
									key={group.key}
									framework={framework}
									group={group}
									editingStoryId={editingStoryId}
									onCancelEdit={() => setEditingStoryId(null)}
									onEditStory={onEditStory}
									onOpenDetail={setDetailRow}
									onStartEdit={setEditingStoryId}
								/>
							))}
							{unassignedRows.length > 0 && (
								<SprintGroupRows
									framework={framework}
									group={{ key: 'unassigned', label: 'Sin sprint', meta: 'Pendientes de asignacion', rows: unassignedRows }}
									editingStoryId={editingStoryId}
									onCancelEdit={() => setEditingStoryId(null)}
									onEditStory={onEditStory}
									onOpenDetail={setDetailRow}
									onStartEdit={setEditingStoryId}
								/>
							)}
						</tbody>
					</table>
				</div>
			) : (
				<div className="px-6 py-10">
					<div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center">
						<p className="text-sm font-semibold text-foreground">Todavia no hay sprints para mostrar.</p>
						<p className="mt-2 text-sm text-muted">
							Cuando el Agente 5 genere el plan, esta tabla mostrara las HU organizadas por sprint.
						</p>
					</div>
				</div>
			)}

			<DetailModal
				open={Boolean(detailRow)}
				onClose={() => setDetailRow(null)}
				title={detailRow?.story.title ?? ''}
				subtitle={detailRow?.story.id}
				eyebrow={detailRow?.sprintNumber ? `Sprint ${detailRow.sprintNumber}` : 'Historia de usuario'}
				maxWidth="xl"
			>
				{detailRow && (
					<UserStoryDetailContent
						story={detailRow.story}
						epicTitle={detailRow.epicTitle}
						estimation={detailRow.estimation}
						prioritization={detailRow.prioritization}
						framework={framework ?? undefined}
					/>
				)}
			</DetailModal>
		</section>
	);
}

interface SprintRowsGroup {
	key: string;
	label: string;
	meta: string;
	rows: DashboardSprintStoryRow[];
}

function groupRowsBySprint(rows: DashboardSprintStoryRow[]): SprintRowsGroup[] {
	const groups = new Map<string, SprintRowsGroup>();

	rows.forEach((row) => {
		const key = row.sprintId ?? 'unassigned';
		const existing = groups.get(key);
		if (existing) {
			existing.rows.push(row);
			return;
		}

		groups.set(key, {
			key,
			label: row.sprintNumber ? `Sprint ${row.sprintNumber}` : 'Sin sprint',
			meta: [row.sprintGoal, formatDateRange(row.startDate, row.endDate)].filter(Boolean).join(' / '),
			rows: [row],
		});
	});

	return Array.from(groups.values());
}

function SprintGroupRows({
	framework,
	group,
	editingStoryId,
	onCancelEdit,
	onEditStory,
	onOpenDetail,
	onStartEdit,
}: {
	framework: PrioritizationFramework | null;
	group: SprintRowsGroup;
	editingStoryId: string | null;
	onCancelEdit: () => void;
	onEditStory: (
		storyId: string,
		updates: Partial<UserStory>,
		estimationUpdates?: Partial<StoryEstimation>
	) => Promise<void>;
	onOpenDetail: (row: DashboardSprintStoryRow) => void;
	onStartEdit: (storyId: string) => void;
}) {
	return (
		<>
			<tr className="border-b border-border bg-surface-hover/50">
				<td colSpan={6} className="px-6 py-3">
					<div className="flex flex-wrap items-center gap-3">
						<span className="text-sm font-bold text-foreground">{group.label}</span>
						<span className="text-xs text-muted">{group.meta}</span>
						<span className="ml-auto rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-bold text-foreground">
							{group.rows.length} HU
						</span>
					</div>
				</td>
			</tr>
			{group.rows.map((row) =>
				editingStoryId === row.story.id ? (
					<EditableStoryRow
						key={row.id}
						row={row}
						onCancel={onCancelEdit}
						onSave={async (updates, estimationUpdates) => {
							await onEditStory(row.story.id, updates, estimationUpdates);
							onCancelEdit();
						}}
					/>
				) : (
					<StoryReadOnlyRow
						key={row.id}
						framework={framework}
						row={row}
						onOpenDetail={() => onOpenDetail(row)}
						onStartEdit={() => onStartEdit(row.story.id)}
					/>
				)
			)}
		</>
	);
}

function StoryReadOnlyRow({
	framework,
	row,
	onOpenDetail,
	onStartEdit,
}: {
	framework: PrioritizationFramework | null;
	row: DashboardSprintStoryRow;
	onOpenDetail: () => void;
	onStartEdit: () => void;
}) {
	return (
		<tr className="border-b border-border/70 transition-colors hover:bg-surface-hover/40">
			<td className="px-6 py-4 align-top">
				<span className="font-mono text-xs font-bold text-muted">{row.story.id}</span>
			</td>
			<td className="max-w-[380px] px-4 py-4 align-top">
				<p className="text-sm font-semibold text-foreground">{row.story.title}</p>
				<p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{row.story.description}</p>
			</td>
			<td className="px-4 py-4 align-top text-sm text-muted">{row.epicTitle}</td>
			<td className="px-4 py-4 align-top">
				<span className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-bold text-foreground">
					{row.estimation?.points ?? 0}
				</span>
			</td>
			<td className="px-4 py-4 align-top">
				{framework && row.prioritization ? (
					<CategoryBadge framework={framework} category={row.prioritization.category} />
				) : (
					<span className="text-xs text-muted">N/D</span>
				)}
			</td>
			<td className="px-4 py-4 align-top">
				<div className="flex justify-end gap-1.5">
					<ViewDetailsButton onClick={onOpenDetail} label="Ver HU en detalle" />
					<button
						type="button"
						onClick={onStartEdit}
						aria-label="Editar HU"
						title="Editar HU"
						className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted transition-all hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
					>
						<EditIcon />
					</button>
				</div>
			</td>
		</tr>
	);
}

function EditableStoryRow({
	row,
	onCancel,
	onSave,
}: {
	row: DashboardSprintStoryRow;
	onCancel: () => void;
	onSave: (
		updates: Partial<UserStory>,
		estimationUpdates?: Partial<StoryEstimation>
	) => Promise<void>;
}) {
	const [title, setTitle] = useState(row.story.title);
	const [description, setDescription] = useState(row.story.description);
	const [criteria, setCriteria] = useState(row.story.acceptanceCriteria);
	const [points, setPoints] = useState(String(row.estimation?.points ?? 0));
	const [isSaving, setIsSaving] = useState(false);
	const parsedPoints = Number(points);
	const isInvalidPoints = !Number.isInteger(parsedPoints) || parsedPoints < 0;
	const isSaveDisabled = !title.trim() || !description.trim() || isInvalidPoints || isSaving;

	return (
		<tr className="border-b border-primary/20 bg-primary/5">
			<td className="px-6 py-4 align-top">
				<span className="font-mono text-xs font-bold text-primary">{row.story.id}</span>
			</td>
			<td colSpan={5} className="px-4 py-4">
				<div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
					<div className="flex flex-col gap-3">
						<div className="grid gap-3 sm:grid-cols-[1fr_120px]">
							<label className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
								Titulo
								<input
									value={title}
									onChange={(event) => setTitle(event.target.value)}
									className="mt-1 w-full rounded-lg border border-input-border bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
								/>
							</label>
							<label className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
								Story points
								<input
									type="number"
									min={0}
									step={1}
									value={points}
									onChange={(event) => setPoints(event.target.value)}
									className={[
										'mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm font-bold text-foreground outline-none transition-all',
										isInvalidPoints
											? 'border-red-400/60 focus:border-red-400 focus:ring-1 focus:ring-red-400/30'
											: 'border-input-border focus:border-primary/60 focus:ring-1 focus:ring-primary/30',
									].join(' ')}
								/>
							</label>
						</div>
						<label className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
							Descripcion
							<textarea
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								rows={4}
								className="mt-1 w-full resize-none rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
							/>
						</label>
					</div>
					<div className="group">
						<AcceptanceCriteriaEditor criteria={criteria} onChange={setCriteria} disabled={false} />
					</div>
				</div>
				<div className="mt-4 flex justify-end gap-2">
					<button
						type="button"
						onClick={onCancel}
						className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
					>
						Cancelar
					</button>
					<button
						type="button"
						onClick={async () => {
							if (isSaveDisabled) return;
							setIsSaving(true);
							try {
								await onSave({
									title: title.trim(),
									description: description.trim(),
									acceptanceCriteria: criteria,
								}, {
									points: parsedPoints,
									justification:
										row.estimation?.justification ||
										'Estimacion ajustada manualmente desde el dashboard.',
									isModified: true,
								});
							} finally {
								setIsSaving(false);
							}
						}}
						disabled={isSaveDisabled}
						className={[
							'rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
							isSaveDisabled
								? 'bg-disabled text-disabled-text cursor-not-allowed'
								: 'bg-primary text-white hover:bg-primary-hover',
						].join(' ')}
					>
						{isSaving ? 'Guardando...' : 'Guardar cambios'}
					</button>
				</div>
			</td>
		</tr>
	);
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
	if (!startDate || !endDate) return '';
	return `${startDate} - ${endDate}`;
}

function EditIcon() {
	return (
		<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
			<path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
		</svg>
	);
}
