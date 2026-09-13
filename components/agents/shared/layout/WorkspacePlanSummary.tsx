'use client';

import Link from 'next/link';
import { useWorkspace } from '@/hooks/useWorkspace';
import { PLAN_LIMITS } from '@/lib/plans/definitions';
import { canUpgradePlan, getPlanDisplayName } from '@/lib/plans/plan-display';
import { sidebarCollapsibleClass, sidebarCollapsibleInnerClass } from './sidebar-styles';

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
    <div className={sidebarCollapsibleClass}>
      <div className={sidebarCollapsibleInnerClass}>
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">
              Plan {getPlanDisplayName(planId)}
            </p>
            {showUpgrade ? (
              <Link
                href="/#pricing"
                className="text-xs font-medium text-primary transition-opacity hover:opacity-80"
              >
                Mejorar
              </Link>
            ) : (
              <span className="text-xs text-subtle">Activo</span>
            )}
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px] text-subtle">
            <span>
              {activeCount}/{maxActive} activos
            </span>
            <span className="tabular-nums">
              {projects.length}/{maxProjects}
            </span>
          </div>

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
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
    </div>
  );
}
