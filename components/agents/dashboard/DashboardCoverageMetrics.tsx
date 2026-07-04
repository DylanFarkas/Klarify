import { DashboardMetricCard } from './DashboardMetricCard';
import type { DashboardMetrics } from './dashboardMetrics';

export function DashboardCoverageMetrics({ metrics }: { metrics: DashboardMetrics }) {
	return (
		<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<DashboardMetricCard
				label="Cobertura de estimacion"
				value={`${metrics.estimationCoverage}%`}
				hint={`${metrics.estimatedStoryCount} de ${metrics.storyCount} historias tienen estimacion.`}
				tone={metrics.estimationCoverage === 100 ? 'success' : 'default'}
			/>
			<DashboardMetricCard
				label="Cobertura de prioridad"
				value={`${metrics.prioritizationCoverage}%`}
				hint={`${metrics.prioritizedStoryCount} de ${metrics.storyCount} historias ya fueron priorizadas.`}
				tone={metrics.prioritizationCoverage === 100 ? 'success' : 'warning'}
			/>
			<DashboardMetricCard
				label="Cobertura de sprint"
				value={metrics.hasPlan ? `${metrics.planningCoverage}%` : '0%'}
				hint={
					metrics.hasPlan
						? `${metrics.plannedStoryCount} historias estan distribuidas en ${metrics.sprintCount} sprint${metrics.sprintCount === 1 ? '' : 's'}.`
						: 'Todavia no hay un plan de sprints consolidado.'
				}
			/>
			<DashboardMetricCard
				label="Deseos capturados"
				value={metrics.wishesCount}
				hint="Relacion entre la captura inicial y el backlog construido a partir de ella."
			/>
		</section>
	);
}
