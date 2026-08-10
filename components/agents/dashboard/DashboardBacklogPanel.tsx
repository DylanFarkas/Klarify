'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Epic } from '@/lib/types/agent-2';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import { CategoryBadge } from '@/components/agents/agent-4/CategorySelect';
import { EmptyAgentState } from '@/components/agents/shared/EmptyAgentState';
import type { DashboardMetrics, DashboardSprintStoryRow } from './dashboardMetrics';

interface DashboardBacklogPanelProps {
	metrics: DashboardMetrics;
}

export function DashboardBacklogPanel({ metrics }: DashboardBacklogPanelProps) {
	const { epics, estimations, priorities, framework, storyCount } = metrics;

	const sprintByStoryId = useMemo(() => {
		const map = new Map<string, { label: string }>();
		const allRows: DashboardSprintStoryRow[] = [
			...metrics.sprintStoryRows,
			...metrics.unassignedStoryRows,
		];
		for (const row of allRows) {
			map.set(row.story.id, {
				label: row.sprintNumber != null ? `Sprint ${row.sprintNumber}` : 'Sin sprint',
			});
		}
		return map;
	}, [metrics.sprintStoryRows, metrics.unassignedStoryRows]);

	if (epics.length === 0) {
		return (
			<EmptyAgentState
				title="Aún no hay backlog"
				description="Cuando generes épicas e historias en el Agente 2, aparecerán aquí organizadas."
				icon={
					<svg
						className="h-6 w-6 text-muted"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={1.5}
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
						/>
					</svg>
				}
				action={
					<Link
						href="/agentes/2"
						className="inline-flex cursor-pointer items-center rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
					>
						Ir al Agente 2
					</Link>
				}
			/>
		);
	}

	return (
		<section
			className="flex flex-col rounded-xl border border-border bg-surface"
			aria-labelledby="dashboard-backlog-heading"
		>
			<div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5 md:px-5">
				<div className="min-w-0">
					<div className="flex items-center gap-2.5">
						<h2
							id="dashboard-backlog-heading"
							className="text-[15px] font-semibold tracking-tight text-foreground"
						>
							Backlog
						</h2>
						<span className="text-[12px] tabular-nums text-subtle">{epics.length}</span>
					</div>
					<p className="mt-1 text-[12px] text-muted">
						{storyCount} historia{storyCount !== 1 ? 's' : ''} · {metrics.totalPoints} SP
					</p>
				</div>
			</div>

			<div>
				{epics.map((epic, index) => (
					<DashboardEpicGroup
						key={epic.id}
						epic={epic}
						index={index}
						estimations={estimations}
						priorities={priorities}
						framework={framework}
						sprintByStoryId={sprintByStoryId}
					/>
				))}
			</div>
		</section>
	);
}

function DashboardEpicGroup({
	epic,
	index,
	estimations,
	priorities,
	framework,
	sprintByStoryId,
}: {
	epic: Epic;
	index: number;
	estimations: DashboardMetrics['estimations'];
	priorities: DashboardMetrics['priorities'];
	framework: PrioritizationFramework | null;
	sprintByStoryId: Map<string, { label: string }>;
}) {
	const [isExpanded, setIsExpanded] = useState(true);
	const displayNumber = String(index + 1).padStart(2, '0');
	const epicPoints = epic.userStories.reduce(
		(sum, story) => sum + (estimations[story.id]?.points ?? 0),
		0
	);

	return (
		<article className={['group', index > 0 ? 'border-t border-border' : ''].join(' ')}>
			<div className="flex items-start gap-2.5 px-4 py-3.5 transition-colors hover:bg-surface-hover/40 md:px-5">
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="mt-0.5 shrink-0 cursor-pointer rounded-md p-1 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
					aria-expanded={isExpanded}
					aria-label={isExpanded ? 'Colapsar épica' : 'Expandir épica'}
				>
					<svg
						className={[
							'h-4 w-4 transition-transform duration-200',
							isExpanded ? 'rotate-90' : '',
						].join(' ')}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
						aria-hidden="true"
					>
						<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
					</svg>
				</button>

				<div className="grid min-w-0 flex-1 grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-2.5">
					<span className="pt-0.5 text-[12px] tabular-nums text-subtle">{displayNumber}</span>
					<div className="min-w-0">
						<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
							<h3 className="text-[15px] font-medium text-foreground">{epic.title}</h3>
							<span className="text-[12px] tabular-nums text-subtle">
								{epic.userStories.length} HU
								{epic.userStories.length !== 1 ? 's' : ''}
								{' · '}
								{epicPoints} SP
							</span>
						</div>
						{epic.description ? (
							<p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{epic.description}</p>
						) : null}
					</div>
				</div>
			</div>

			{isExpanded ? (
				<ul className="border-t border-border">
					{epic.userStories.length === 0 ? (
						<li className="px-4 py-3 pl-13 text-[13px] text-muted md:px-5 md:pl-14">
							Sin historias en esta épica.
						</li>
					) : (
						epic.userStories.map((story, storyIndex) => {
							const points = estimations[story.id]?.points;
							const prioritization = priorities[story.id];
							const sprint = sprintByStoryId.get(story.id);

							return (
								<li
									key={story.id}
									className={[
										'flex flex-wrap items-start gap-x-3 gap-y-1.5 px-4 py-2.5 pl-13 transition-colors hover:bg-surface-hover/40 md:px-5 md:pl-14',
										storyIndex > 0 ? 'border-t border-border' : '',
									].join(' ')}
								>
									<div className="min-w-0 flex-1">
										<p className="text-[11px] tabular-nums text-subtle">
											{story.id}
										</p>
										<p className="mt-0.5 text-[13px] font-medium text-foreground">
											{story.title}
										</p>
									</div>
									<div className="flex shrink-0 flex-wrap items-center gap-1.5">
										{points != null ? (
											<span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] tabular-nums text-muted">
												{points} SP
											</span>
										) : null}
										{framework && prioritization ? (
											<CategoryBadge
												framework={framework}
												category={prioritization.category}
											/>
										) : null}
										{sprint ? (
											<span className="text-[11px] text-subtle">{sprint.label}</span>
										) : null}
									</div>
								</li>
							);
						})
					)}
				</ul>
			) : null}
		</article>
	);
}
