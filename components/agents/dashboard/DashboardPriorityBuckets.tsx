import { DashboardPriorityBucketCard } from './DashboardPriorityBucketCard';
import type { DashboardMetrics } from './dashboardMetrics';
import { formatEffortTotal } from '@/lib/utils/estimation';

export function DashboardPriorityBuckets({ metrics }: { metrics: DashboardMetrics }) {
	return (
		<section className="grid gap-4 md:grid-cols-3">
			<DashboardPriorityBucketCard
				title="Alta"
				count={metrics.priorityBuckets.alta.count}
				effortLabel={formatEffortTotal(metrics.priorityBuckets.alta.points, metrics.estimationMode)}
				description="Historias que concentran el valor o la urgencia principal del backlog."
			/>
			<DashboardPriorityBucketCard
				title="Media"
				count={metrics.priorityBuckets.media.count}
				effortLabel={formatEffortTotal(metrics.priorityBuckets.media.points, metrics.estimationMode)}
				description="Historias importantes que normalmente entran despues del nucleo critico."
			/>
			<DashboardPriorityBucketCard
				title="Baja"
				count={metrics.priorityBuckets.baja.count}
				effortLabel={formatEffortTotal(metrics.priorityBuckets.baja.points, metrics.estimationMode)}
				description="Historias de menor impacto inmediato o que pueden esperar otra iteracion."
			/>
		</section>
	);
}
