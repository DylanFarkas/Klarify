import type { Epic } from '@/lib/types/agent-2';
import type { UserStory } from '@/lib/types/agent-2';
import type { EstimationMode, StoryEstimation } from '@/lib/types/agent-3';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { SprintPlan } from '@/lib/types/agent-5';
import { createEmptySprintPlan } from '@/lib/utils/sprint-plan-mutations';
import { getLiveBacklog } from '@/lib/utils/live-backlog';
import { getEffortValue, isStoryEstimated } from '@/lib/utils/estimation';
import type { KanbanStatus } from '@/lib/types/execution';
import type { UserWorkspace } from '@/lib/types/workspace';

export type PriorityBucket = 'alta' | 'media' | 'baja';

export interface DashboardMetrics {
	epics: Epic[];
	storyCount: number;
	bugCount: number;
	taskCount: number;
	totalPoints: number;
	estimationMode: EstimationMode;
	wishesCount: number;
	estimatedStoryCount: number;
	prioritizedStoryCount: number;
	averagePointsPerStory: number;
	averageStoriesPerEpic: number;
	averageAcceptanceCriteriaPerStory: number;
	completionCount: number;
	completionPercentage: number;
	transcriptLanguage: string;
	transcriptDurationLabel: string;
	transcriptSegmentCount: number;
	contextIsSufficient: boolean | null;
	framework: PrioritizationFramework | null;
	priorityBuckets: Record<PriorityBucket, { count: number; points: number }>;
	sprintCount: number;
	plannedStoryCount: number;
	unassignedStoryCount: number;
	averageVelocity: number;
	averageStoriesPerSprint: number;
	estimationCoverage: number;
	prioritizationCoverage: number;
	planningCoverage: number;
	hasPlan: boolean;
	plan: SprintPlan | null;
	estimations: Record<string, StoryEstimation>;
	priorities: Record<string, StoryPrioritization>;
	nextAction: {
		label: string;
		href: string;
		description: string;
	};
	epicBreakdown: Array<{
		id: string;
		title: string;
		description: string;
		storyCount: number;
		doneCount: number;
		points: number;
		highPriorityCount: number;
		mediumPriorityCount: number;
		lowPriorityCount: number;
	}>;
	sprintStoryRows: DashboardSprintStoryRow[];
	unassignedStoryRows: DashboardSprintStoryRow[];
	executionStatusCounts: Record<KanbanStatus, number>;
}

export interface DashboardSprintStoryRow {
	id: string;
	sprintId: string | null;
	sprintNumber: number | null;
	sprintGoal: string;
	startDate: string | null;
	endDate: string | null;
	story: UserStory;
	epicId: string;
	epicTitle: string;
	estimation?: StoryEstimation;
	prioritization?: StoryPrioritization;
	executionStatus: KanbanStatus;
	assigneeId: string | null;
}

function resolveEpics(workspace: UserWorkspace): Epic[] {
	return getLiveBacklog(workspace).epics;
}

function resolveEstimations(workspace: UserWorkspace): Record<string, StoryEstimation> {
	return getLiveBacklog(workspace).estimations;
}

function resolvePriorities(workspace: UserWorkspace): Record<string, StoryPrioritization> {
	return getLiveBacklog(workspace).priorities;
}

function resolveFramework(workspace: UserWorkspace): PrioritizationFramework | null {
	return getLiveBacklog(workspace).framework;
}

function resolvePlan(workspace: UserWorkspace): SprintPlan | null {
	const live = getLiveBacklog(workspace);
	if (live.plan) return live.plan;

	// Defensa: backlog priorizado sin plan materializado aún
	if (workspace.agent4.status === 'approved' && live.epics.length > 0) {
		return createEmptySprintPlan(live.epics);
	}
	return null;
}

function getPriorityBucket(
	framework: PrioritizationFramework | null,
	category: string
): PriorityBucket {
	switch (framework) {
		case 'wsjf':
			if (category === 'critical' || category === 'high') return 'alta';
			if (category === 'medium') return 'media';
			return 'baja';
		case 'rice':
			if (category === 'quick-win') return 'alta';
			if (category === 'major-project') return 'media';
			return 'baja';
		case 'value-effort':
			if (category === 'high-value-low-effort') return 'alta';
			if (category === 'high-value-high-effort') return 'media';
			return 'baja';
		case 'moscow':
		default:
			if (category === 'must') return 'alta';
			if (category === 'should') return 'media';
			return 'baja';
	}
}

function formatDuration(seconds: number): string {
	if (!seconds) return '0 min';

	const totalMinutes = Math.round(seconds / 60);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours === 0) return `${minutes} min`;
	if (minutes === 0) return `${hours} h`;
	return `${hours} h ${minutes} min`;
}

export function humanizeStatus(status: string): string {
	switch (status) {
		case 'idle':
			return 'Pendiente';
		case 'uploading':
			return 'Cargando';
		case 'transcribing':
			return 'Transcribiendo';
		case 'editing_transcription':
			return 'Editando transcripcion';
		case 'assessing':
			return 'Evaluando contexto';
		case 'clarifying':
			return 'Aclarando';
		case 'extracting':
			return 'Extrayendo';
		case 'generating':
			return 'Generando';
		case 'estimating':
			return 'Estimando';
		case 'prioritizing':
			return 'Priorizando';
		case 'planning':
			return 'Planificando';
		case 'review':
			return 'En revision';
		case 'approved':
			return 'Aprobado';
		default:
			return status;
	}
}

export function getStatusTone(status: string): 'success' | 'default' | 'warning' {
	if (status === 'approved') return 'success';
	if (
		status === 'review' ||
		status === 'clarifying' ||
		status === 'extracting' ||
		status === 'estimating' ||
		status === 'prioritizing' ||
		status === 'planning' ||
		status === 'generating' ||
		status === 'transcribing' ||
		status === 'uploading' ||
		status === 'assessing'
	) {
		return 'warning';
	}
	return 'default';
}

export function buildDashboardMetrics(workspace: UserWorkspace): DashboardMetrics {
	const epics = resolveEpics(workspace);
	const live = getLiveBacklog(workspace);
	const estimations = live.estimations;
	const estimationMode = live.estimationMode;
	const priorities = live.priorities;
	const framework = live.framework;
	const plan = resolvePlan(workspace);

	const stories = epics.flatMap((epic) => epic.userStories);
	const storyCount = stories.length;
	const bugCount = stories.filter((story) => (story.type ?? 'story') === 'bug').length;
	const taskCount = stories.filter((story) => (story.type ?? 'story') === 'task').length;
	const wishesCount = workspace.agent1.wishes.length;
	const totalPoints = stories.reduce(
		(sum, story) => sum + getEffortValue(estimations[story.id], estimationMode),
		0
	);
	const estimatedStoryCount = stories.filter((story) =>
		isStoryEstimated(estimations[story.id], estimationMode)
	).length;
	const prioritizedStoryCount = stories.filter((story) => Boolean(priorities[story.id])).length;
	const totalAcceptanceCriteria = stories.reduce(
		(sum, story) => sum + story.acceptanceCriteria.length,
		0
	);

	const priorityBuckets: DashboardMetrics['priorityBuckets'] = {
		alta: { count: 0, points: 0 },
		media: { count: 0, points: 0 },
		baja: { count: 0, points: 0 },
	};

	stories.forEach((story) => {
		const prioritization = priorities[story.id];
		if (!prioritization) return;

		const bucket = getPriorityBucket(framework, prioritization.category);
		priorityBuckets[bucket].count += 1;
		priorityBuckets[bucket].points += getEffortValue(estimations[story.id], estimationMode);
	});

	const completionCount = [
		workspace.agent1.status,
		workspace.agent2.status,
		workspace.agent3.status,
		workspace.agent4.status,
		workspace.pipeline.agent6Input ? 'approved' : 'idle',
	].filter((status) => status === 'approved').length;

	const completionPercentage = Math.round((completionCount / 5) * 100);
	const transcript = workspace.agent1.transcription;
	const contextIsSufficient = workspace.agent1.discovery?.isSufficient ?? null;
	const sprintCount = plan?.sprints.length ?? 0;
	const plannedStoryCount = plan ? new Set(plan.sprints.flatMap((sprint) => sprint.storyIds)).size : 0;
	const unassignedStoryCount =
		plan?.unassignedStoryIds.length ?? Math.max(storyCount - plannedStoryCount, 0);
	const averageVelocity =
		sprintCount > 0
			? Math.round(plan!.sprints.reduce((sum, sprint) => sum + sprint.velocitySp, 0) / sprintCount)
			: 0;
	const averageStoriesPerSprint = sprintCount > 0 ? plannedStoryCount / sprintCount : 0;
	const estimationCoverage = storyCount > 0 ? Math.round((estimatedStoryCount / storyCount) * 100) : 0;
	const prioritizationCoverage =
		storyCount > 0 ? Math.round((prioritizedStoryCount / storyCount) * 100) : 0;
	const planningCoverage =
		storyCount > 0 && plan ? Math.round((plannedStoryCount / storyCount) * 100) : 0;
	const averagePointsPerStory = storyCount > 0 ? totalPoints / storyCount : 0;
	const averageStoriesPerEpic = epics.length > 0 ? storyCount / epics.length : 0;
	const averageAcceptanceCriteriaPerStory =
		storyCount > 0 ? totalAcceptanceCriteria / storyCount : 0;

	const nextAction =
		storyCount === 0
			? {
					label: 'Comenzar en el Agente 1',
					href: '/agentes/1',
					description: 'Carga una reunion para generar el primer backlog del workspace.',
				}
			: estimatedStoryCount < storyCount
				? {
						label: 'Completar estimaciones',
						href: '/agentes/3',
						description: 'Faltan historias por estimar antes de priorizar el backlog.',
					}
				: prioritizedStoryCount < storyCount
					? {
							label: 'Priorizar historias',
							href: '/agentes/4',
							description: 'Aun hay historias sin ordenar por valor y esfuerzo.',
						}
					: !plan || plan.sprints.length === 0
						? {
								label: 'Crear sprints',
								href: '/agentes/backlog',
								description: 'Organiza el backlog en sprints de forma manual.',
							}
						: {
								label: 'Revisar el backlog',
								href: '/agentes/backlog',
								description: 'Ajusta sprints, mueve HU o edita historias cuando lo necesites.',
							};

	const epicBreakdown = epics.map((epic) => {
		const storyEntries = epic.userStories.map((story) => ({
			priority: priorities[story.id],
			points: getEffortValue(estimations[story.id], estimationMode),
			done: (workspace.execution?.stories[story.id]?.status ?? 'todo') === 'done',
		}));

		return {
			id: epic.id,
			title: epic.title,
			description: epic.description,
			storyCount: epic.userStories.length,
			doneCount: storyEntries.filter((entry) => entry.done).length,
			points: storyEntries.reduce((sum, entry) => sum + entry.points, 0),
			highPriorityCount: storyEntries.filter(
				(entry) => entry.priority && getPriorityBucket(framework, entry.priority.category) === 'alta'
			).length,
			mediumPriorityCount: storyEntries.filter(
				(entry) => entry.priority && getPriorityBucket(framework, entry.priority.category) === 'media'
			).length,
			lowPriorityCount: storyEntries.filter(
				(entry) => entry.priority && getPriorityBucket(framework, entry.priority.category) === 'baja'
			).length,
		};
	});
	const storyLookup = new Map(
		epics.flatMap((epic) =>
			epic.userStories.map((story) => [
				story.id,
				{
					story,
					epicId: epic.id,
					epicTitle: epic.title,
				},
			])
		)
	);
	const toSprintStoryRow = (
		storyId: string,
		sprint: NonNullable<SprintPlan>['sprints'][number] | null
	): DashboardSprintStoryRow | null => {
		const entry = storyLookup.get(storyId);
		if (!entry) return null;

		return {
			id: `${sprint?.id ?? 'unassigned'}-${storyId}`,
			sprintId: sprint?.id ?? null,
			sprintNumber: sprint?.number ?? null,
			sprintGoal: sprint?.sprintGoal ?? 'Sin sprint asignado',
			startDate: sprint?.startDate ?? null,
			endDate: sprint?.endDate ?? null,
			story: entry.story,
			epicId: entry.epicId,
			epicTitle: entry.epicTitle,
			estimation: estimations[storyId],
			prioritization: priorities[storyId],
			executionStatus: workspace.execution?.stories[storyId]?.status ?? 'todo',
			assigneeId: workspace.execution?.stories[storyId]?.assigneeId ?? null,
		};
	};
	const sprintStoryRows =
		plan?.sprints.flatMap((sprint) =>
			sprint.storyIds
				.map((storyId) => toSprintStoryRow(storyId, sprint))
				.filter((row): row is DashboardSprintStoryRow => Boolean(row))
		) ?? [];
	const unassignedStoryRows =
		plan?.unassignedStoryIds
			.map((storyId) => toSprintStoryRow(storyId, null))
			.filter((row): row is DashboardSprintStoryRow => Boolean(row)) ?? [];

	const allSprintRows = [...sprintStoryRows, ...unassignedStoryRows];
	const executionStatusCounts: DashboardMetrics['executionStatusCounts'] = {
		todo: 0,
		in_progress: 0,
		code_review: 0,
		done: 0,
	};
	for (const row of allSprintRows) {
		executionStatusCounts[row.executionStatus] += 1;
	}

	return {
		epics,
		storyCount,
		bugCount,
		taskCount,
		totalPoints,
		estimationMode,
		wishesCount,
		estimatedStoryCount,
		prioritizedStoryCount,
		averagePointsPerStory,
		averageStoriesPerEpic,
		averageAcceptanceCriteriaPerStory,
		completionCount,
		completionPercentage,
		transcriptLanguage: transcript?.language ?? 'Sin datos',
		transcriptDurationLabel: transcript ? formatDuration(transcript.duration) : '0 min',
		transcriptSegmentCount: transcript?.segments.length ?? 0,
		contextIsSufficient,
		framework,
		priorityBuckets,
		sprintCount,
		plannedStoryCount,
		unassignedStoryCount,
		averageVelocity,
		averageStoriesPerSprint,
		estimationCoverage,
		prioritizationCoverage,
		planningCoverage,
		hasPlan: Boolean(plan),
		plan,
		estimations,
		priorities,
		nextAction,
		epicBreakdown,
		sprintStoryRows,
		unassignedStoryRows,
		executionStatusCounts,
	};
}
