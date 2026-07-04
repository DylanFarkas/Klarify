import Link from 'next/link';
import { DashboardProgressBar } from './DashboardProgressBar';
import { DashboardStatusPill } from './DashboardStatusPill';

interface ActiveAgent {
	name: string;
	status: string;
	href: string;
}

interface DashboardPipelinePanelProps {
	activeAgents: readonly ActiveAgent[];
	completionPercentage: number;
}

export function DashboardPipelinePanel({
	activeAgents,
	completionPercentage,
}: DashboardPipelinePanelProps) {
	return (
		<div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Flujo</p>
					<h2 className="mt-2 text-xl font-bold text-foreground">Estado del pipeline</h2>
					<p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
						Cada agente deja datos persistidos en el workspace. Este panel muestra que partes del flujo estan completas y cuales siguen en curso.
					</p>
				</div>
				<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-right">
					<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Progreso</p>
					<p className="mt-1 text-2xl font-bold text-foreground">{completionPercentage}%</p>
				</div>
			</div>

			<DashboardProgressBar value={completionPercentage} />

			<div className="mt-6 grid gap-3 md:grid-cols-2">
				{activeAgents.map((agent, index) => (
					<div key={agent.name} className="rounded-2xl border border-border bg-surface px-4 py-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">
									Paso {index + 1}
								</p>
								<Link href={agent.href} className="mt-2 block text-base font-semibold text-foreground transition-colors hover:text-primary">
									{agent.name}
								</Link>
							</div>
							<DashboardStatusPill status={agent.status} />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
