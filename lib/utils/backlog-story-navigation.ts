import type { DashboardMetrics, DashboardSprintStoryRow } from '@/components/agents/dashboard/dashboardMetrics';
import type { SprintPlan } from '@/lib/types/agent-5';
import { getSprintStatus } from '@/lib/types/agent-5';

export function backlogStoryHref(storyId: string): string {
  return `/agentes/backlog/${encodeURIComponent(storyId)}`;
}

/** Orden de filas igual que la tabla: backlog sin asignar, luego sprints en orden del plan. */
export function getOrderedBacklogStoryRows(
  metrics: Pick<DashboardMetrics, 'sprintStoryRows' | 'unassignedStoryRows' | 'plan'>
): DashboardSprintStoryRow[] {
  const rowsBySprint = new Map<string, DashboardSprintStoryRow[]>();
  for (const row of metrics.sprintStoryRows) {
    if (!row.sprintId) continue;
    const list = rowsBySprint.get(row.sprintId) ?? [];
    list.push(row);
    rowsBySprint.set(row.sprintId, list);
  }

  const ordered: DashboardSprintStoryRow[] = [...metrics.unassignedStoryRows];
  for (const sprint of metrics.plan?.sprints ?? []) {
    ordered.push(...(rowsBySprint.get(sprint.id) ?? []));
  }
  return ordered;
}

export function findBacklogStoryRow(
  metrics: Pick<DashboardMetrics, 'sprintStoryRows' | 'unassignedStoryRows'>,
  storyId: string
): DashboardSprintStoryRow | null {
  return (
    [...metrics.sprintStoryRows, ...metrics.unassignedStoryRows].find(
      (row) => row.story.id === storyId
    ) ?? null
  );
}

export interface SprintOption {
  id: string;
  label: string;
}

function getClosedSprintIds(plan: SprintPlan | null): Set<string> {
  return new Set(
    (plan?.sprints ?? [])
      .filter((sprint) => getSprintStatus(sprint) === 'completed')
      .map((sprint) => sprint.id)
  );
}

/** Opciones de sprint editables para selects en tabla, formularios y modales. */
export function getSprintOptionsForPlan(
  plan: SprintPlan | null,
  rows: DashboardSprintStoryRow[] = []
): SprintOption[] {
  const options = new Map<string, SprintOption>();
  const closedIds = getClosedSprintIds(plan);

  plan?.sprints.forEach((sprint) => {
    if (closedIds.has(sprint.id)) return;
    options.set(sprint.id, {
      id: sprint.id,
      label: `Sprint ${sprint.number}`,
    });
  });

  rows.forEach((row) => {
    if (!row.sprintId || !row.sprintNumber || closedIds.has(row.sprintId)) return;
    options.set(row.sprintId, {
      id: row.sprintId,
      label: `Sprint ${row.sprintNumber}`,
    });
  });

  return Array.from(options.values());
}

export function getEditableSprintOptions(
  plan: SprintPlan | null,
  row: DashboardSprintStoryRow | null
): SprintOption[] {
  const options = new Map<string, SprintOption>();
  const closedIds = getClosedSprintIds(plan);

  plan?.sprints.forEach((sprint) => {
    if (closedIds.has(sprint.id)) return;
    options.set(sprint.id, {
      id: sprint.id,
      label: `Sprint ${sprint.number}`,
    });
  });

  if (row?.sprintId && row.sprintNumber && !closedIds.has(row.sprintId)) {
    options.set(row.sprintId, {
      id: row.sprintId,
      label: `Sprint ${row.sprintNumber}`,
    });
  }

  return Array.from(options.values());
}

export function isSprintAssignmentLocked(
  row: DashboardSprintStoryRow | null,
  plan: SprintPlan | null
): boolean {
  if (!row?.sprintId || !plan) return false;
  return plan.sprints.some(
    (sprint) => sprint.id === row.sprintId && getSprintStatus(sprint) === 'completed'
  );
}
