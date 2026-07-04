export function DashboardLoadingState() {
	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
			<div className="animate-[fadeIn_0.3s_ease-out]">
				<div className="mb-5 h-7 w-32 rounded-full bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite]" />
				<div className="mb-4 h-12 w-80 rounded-xl bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite]" />
				<div className="mb-2 h-5 w-96 rounded-lg bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite]" />
				<div className="mb-8 h-5 w-64 rounded-lg bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite]" />
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<div className="h-32 rounded-2xl border border-border bg-surface-hover/60 animate-[shimmerPulse_2s_ease-in-out_infinite]" />
				<div className="h-32 rounded-2xl border border-border bg-surface-hover/60 animate-[shimmerPulse_2s_ease-in-out_infinite]" />
				<div className="h-32 rounded-2xl border border-border bg-surface-hover/60 animate-[shimmerPulse_2s_ease-in-out_infinite]" />
				<div className="h-32 rounded-2xl border border-border bg-surface-hover/60 animate-[shimmerPulse_2s_ease-in-out_infinite]" />
			</div>
		</div>
	);
}
