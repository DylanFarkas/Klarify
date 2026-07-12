'use client';

import Link from 'next/link';
import { useWorkspace } from '@/hooks/useWorkspace';
import { PLAN_LIMITS } from '@/lib/plans/definitions';
import { canUpgradePlan, getPlanDisplayName } from '@/lib/plans/plan-display';

function PlanBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      Pro
    </span>
  );
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/50 px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function WorkspacePlanSummary() {
  const { plan, projects, projectSlots } = useWorkspace();

  const planId = plan?.id ?? 'free';
  const showUpgrade = canUpgradePlan(planId);
  const maxProjects = plan?.limits.maxProjects ?? PLAN_LIMITS.free.maxProjects;
  const maxActive = projectSlots?.maxActive ?? maxProjects;
  const activeCount = projectSlots?.activeCount ?? projects.filter((p) => p.status === 'active').length;
  const usagePercent = maxActive > 0 ? Math.round((activeCount / maxActive) * 100) : 0;
  const nearLimit = usagePercent >= 80;

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">Tu plan</p>
          <p className="mt-1 text-sm font-semibold text-foreground">Plan {getPlanDisplayName(planId)}</p>
        </div>
        {showUpgrade ? (
          <Link
            href="/#pricing"
            className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            Mejorar
          </Link>
        ) : (
          <PlanBadge />
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <UsageStat label="Activos" value={`${activeCount}/${maxActive}`} />
        <UsageStat label="Total" value={`${projects.length}/${maxProjects}`} />
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-subtle">
          <span>Uso de slots activos</span>
          <span className="tabular-nums">{usagePercent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border/80">
          <div
            className={[
              'h-full rounded-full transition-all duration-500',
              nearLimit ? 'bg-amber-500/80' : 'bg-primary/70',
            ].join(' ')}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
