'use client';

import type { SprintPlanningConfig } from '@/lib/types/agent-5';

interface SprintPlanningConfigPanelProps {
  config: SprintPlanningConfig;
  onChange: (config: SprintPlanningConfig) => void;
  disabled: boolean;
  isApproved: boolean;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { dateStyle: 'medium' });
  } catch {
    return dateStr;
  }
}

export function SprintPlanningConfigPanel({
  config,
  onChange,
  disabled,
  isApproved,
}: SprintPlanningConfigPanelProps) {
  if (isApproved) {
    return (
      <div className="rounded-xl border border-success/20 bg-success/5 px-5 py-4">
        <div className="flex items-center gap-3 text-xs text-success/80">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">Plan aprobado — </span>
          <span>{config.sprintCapacitySp} SP/sprint · {config.sprintDurationWeeks} sem · Inicio {formatDate(config.projectStartDate)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-muted/50 px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">Configuración de sprints</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Capacidad:</span>
          <input
            type="number"
            min={1}
            max={200}
            value={config.sprintCapacitySp}
            onChange={(e) => onChange({ ...config, sprintCapacitySp: Math.max(1, Number(e.target.value) || 1) })}
            disabled={disabled}
            className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          />
          <span className="text-xs text-muted">SP/sprint</span>
        </label>

        <span className="h-5 w-px bg-border" />

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Duración:</span>
          <input
            type="number"
            min={1}
            max={8}
            value={config.sprintDurationWeeks}
            onChange={(e) => onChange({ ...config, sprintDurationWeeks: Math.max(1, Number(e.target.value) || 1) })}
            disabled={disabled}
            className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          />
          <span className="text-xs text-muted">semanas</span>
        </label>

        <span className="h-5 w-px bg-border" />

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Inicio:</span>
          <input
            type="date"
            value={config.projectStartDate}
            onChange={(e) => onChange({ ...config, projectStartDate: e.target.value })}
            disabled={disabled}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          />
        </label>
      </div>
    </div>
  );
}
