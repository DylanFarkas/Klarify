import Link from 'next/link';

export function DashboardEmptyState() {
	return (
		<div className="mx-auto flex w-full max-w-lg flex-col items-center py-8 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted">
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
						d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
					/>
				</svg>
			</div>
			<h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
				Aún no hay datos para mostrar
			</h3>
			<p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
				Cuando cargues una reunión en el Agente 1 y avances por el pipeline, el dashboard
				mostrará el backlog, coberturas y el plan de sprints.
			</p>
			<div className="mt-6 flex flex-wrap items-center justify-center gap-2">
				<Link
					href="/agentes/1"
					className="inline-flex items-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
				>
					Ir al Agente 1
				</Link>
				<Link
					href="/agentes/2"
					className="inline-flex items-center rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
				>
					Ver Agente 2
				</Link>
			</div>
		</div>
	);
}
