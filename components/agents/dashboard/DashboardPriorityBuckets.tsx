import { DashboardPriorityBucketCard } from './DashboardPriorityBucketCard';
import type { DashboardMetrics } from './dashboardMetrics';

export function DashboardPriorityBuckets({ metrics }: { metrics: DashboardMetrics }) {
	return (
		<section className="grid gap-4 md:grid-cols-3">
			<DashboardPriorityBucketCard
				title="Alta"
				count={metrics.priorityBuckets.alta.count}
				points={metrics.priorityBuckets.alta.points}
				description="Historias que concentran el valor o la urgencia principal del backlog."
			/>
			<DashboardPriorityBucketCard
				title="Media"
				count={metrics.priorityBuckets.media.count}
				points={metrics.priorityBuckets.media.points}
				description="Historias importantes que normalmente entran despues del nucleo critico."
			/>
			<DashboardPriorityBucketCard
				title="Baja"
				count={metrics.priorityBuckets.baja.count}
				points={metrics.priorityBuckets.baja.points}
				description="Historias de menor impacto inmediato o que pueden esperar otra iteracion."
			/>
		</section>
	);
}
