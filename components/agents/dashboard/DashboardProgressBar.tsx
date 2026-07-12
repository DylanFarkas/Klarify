export function DashboardProgressBar({ value }: { value: number }) {
	return (
		<div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-hover">
			<div
				className="h-full rounded-full bg-primary transition-all duration-500"
				style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
			/>
		</div>
	);
}
