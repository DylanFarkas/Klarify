import { DashboardMetricCard } from './DashboardMetricCard';
import type { DashboardMetrics } from './dashboardMetrics';

export function DashboardSecondaryMetrics({ metrics }: { metrics: DashboardMetrics }) {
	return (
		<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<DashboardMetricCard
				label="HU por epica"
				value={metrics.averageStoriesPerEpic.toFixed(1)}
				hint="Ayuda a ver si el backlog esta equilibrado o concentrado en pocas epicas."
			/>
			<DashboardMetricCard
				label="Criterios por HU"
				value={metrics.averageAcceptanceCriteriaPerStory.toFixed(1)}
				hint="Un proxy simple para entender la profundidad de definicion de cada historia."
			/>
			<DashboardMetricCard
				label="Historias planificadas"
				value={metrics.plannedStoryCount}
				hint={
					metrics.hasPlan
						? `${metrics.unassignedStoryCount} historias quedaron sin asignar.`
						: 'Sin plan consolidado todavia.'
				}
			/>
			<DashboardMetricCard
				label="Velocidad promedio"
				value={metrics.averageVelocity}
				hint={
					metrics.sprintCount > 0
						? `Basada en ${metrics.sprintCount} sprint${metrics.sprintCount === 1 ? '' : 's'} planificado${metrics.sprintCount === 1 ? '' : 's'}.`
						: 'Se calcula cuando existe un plan de sprints.'
				}
			/>
		</section>
	);
}
