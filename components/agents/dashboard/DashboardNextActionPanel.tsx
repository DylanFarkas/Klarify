import Link from 'next/link';
import { DashboardMetricCard, type DashboardCardTone } from './DashboardMetricCard';
import type { DashboardMetrics } from './dashboardMetrics';

export function DashboardNextActionPanel({
  metrics,
  executionBoardEnabled = false,
}: {
  metrics: DashboardMetrics;
  executionBoardEnabled?: boolean;
}) {
	const contextTone: DashboardCardTone =
		metrics.contextIsSufficient === true ? 'success' : metrics.contextIsSufficient === false ? 'warning' : 'default';

	return (
		<div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-sm">
			<div>
				<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Siguiente paso</p>
				<h2 className="mt-2 text-xl font-bold text-foreground">{metrics.nextAction.label}</h2>
				<p className="mt-2 text-sm leading-relaxed text-muted">{metrics.nextAction.description}</p>
			</div>

			<div className="mt-5 flex flex-wrap gap-3">
				<Link
					href={metrics.nextAction.href}
					className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
				>
					Abrir agente
				</Link>
				{metrics.hasPlan && executionBoardEnabled ? (
					<Link
						href="/agentes/board"
						className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
					>
						Ir al tablero
					</Link>
				) : null}
				<Link
					href="/agentes/1"
					className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-hover"
				>
					Revisar desde el inicio
				</Link>
			</div>

			<div className="mt-6 grid gap-3 sm:grid-cols-2">
				<DashboardMetricCard
					label="Contexto"
					value={metrics.contextIsSufficient === null ? 'N/D' : metrics.contextIsSufficient ? 'Suficiente' : 'Vago'}
					hint={`Transcripcion ${metrics.transcriptLanguage} / ${metrics.transcriptDurationLabel} / ${metrics.transcriptSegmentCount} segmentos.`}
					tone={contextTone}
				/>
				<DashboardMetricCard
					label="Planificacion"
					value={metrics.sprintCount}
					hint={
						metrics.hasPlan
							? `${metrics.averageVelocity} SP por sprint en promedio y ${metrics.averageStoriesPerSprint.toFixed(1)} HU por sprint.`
							: 'Aun no hay sprints creados en el workspace.'
					}
				/>
			</div>
		</div>
	);
}
