import { AgentPageHero, AgentStat } from '@/components/agents/shared/layout/AgentPageHero';
import type { DashboardMetrics } from './dashboardMetrics';

interface DashboardHeroProps {
	hasContent: boolean;
	metrics: DashboardMetrics;
}

export function DashboardHero({ hasContent, metrics }: DashboardHeroProps) {
	return (
		<AgentPageHero
			step={6}
			variant="measure"
			title="Dashboard del workspace"
			description="Un resumen vivo del proyecto: captura inicial, backlog, estimaciones, prioridades y plan de sprints en un solo lugar."
			statusBadge={<DashboardStatusBadge hasContent={hasContent} completionCount={metrics.completionCount} />}
			stats={
				<>
					<AgentStat icon={<ClipboardIcon />} value={metrics.epics.length} label={`epica${metrics.epics.length === 1 ? '' : 's'}`} />
					<AgentStat icon={<ListIcon />} value={metrics.storyCount} label={`HU${metrics.storyCount === 1 ? '' : 's'}`} />
					<AgentStat icon={<ClockIcon />} value={metrics.totalPoints} label="Story Points" />
					<AgentStat icon={<CalendarIcon />} value={`${metrics.completionCount}/5`} label="agentes aprobados" />
					<AgentStat icon={<ClockIcon />} value={metrics.averagePointsPerStory.toFixed(1)} label="SP promedio/HU" />
				</>
			}
		/>
	);
}

function DashboardStatusBadge({
	hasContent,
	completionCount,
}: {
	hasContent: boolean;
	completionCount: number;
}) {
	if (completionCount === 5) {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-success">
				<CheckIcon />
				Pipeline completo
			</span>
		);
	}

	if (hasContent) {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-500">
				Workspace activo
			</span>
		);
	}

	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
			Sin datos todavia
		</span>
	);
}

function CheckIcon() {
	return (
		<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
			<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
		</svg>
	);
}

function ClipboardIcon() {
	return (
		<svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
			<path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
		</svg>
	);
}

function ListIcon() {
	return (
		<svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
			<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
		</svg>
	);
}

function ClockIcon() {
	return (
		<svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
	);
}

function CalendarIcon() {
	return (
		<svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
			<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
		</svg>
	);
}
