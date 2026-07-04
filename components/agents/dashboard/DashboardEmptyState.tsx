import Link from 'next/link';

export function DashboardEmptyState() {
	return (
		<section className="rounded-2xl border border-border bg-surface/80 p-8 shadow-sm">
			<div className="max-w-2xl">
				<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Sin datos</p>
				<h2 className="mt-2 text-2xl font-bold text-foreground">Aun no hay metricas para mostrar</h2>
				<p className="mt-3 text-sm leading-relaxed text-muted">
					Cuando cargues una reunion en el Agente 1 y avances por el pipeline, este dashboard empezara a mostrar epicas, historias, puntos, prioridades y sprints automaticamente.
				</p>
				<div className="mt-6 flex flex-wrap gap-3">
					<Link
						href="/agentes/1"
						className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
					>
						Ir al Agente 1
					</Link>
					<Link
						href="/agentes/2"
						className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-hover"
					>
						Ver Agente 2
					</Link>
				</div>
			</div>
		</section>
	);
}
