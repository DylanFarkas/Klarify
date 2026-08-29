import { SPRINT_COLORS } from '@/lib/constants/agent-5';
import type { EstimationMode } from '@/lib/types/agent-3';
import type { PlannedSprint, SprintPlan } from '@/lib/types/agent-5';
import { getSprintStatus } from '@/lib/types/agent-5';
import { formatDateRangeEs } from '@/lib/utils/dates';
import { getEffortValue } from '@/lib/utils/estimation';
import type { DashboardSprintStoryRow } from '@/components/agents/dashboard/dashboardMetrics';

export interface SprintRowsGroup {
  key: string;
  label: string;
  meta: string;
  rows: DashboardSprintStoryRow[];
  sprint: PlannedSprint | null;
  sprintIndex: number | null;
  colorClass: string;
  isUnassigned: boolean;
  velocitySp: number;
}

export function getCapacityColor(velocity: number, capacity: number): string {
  const ratio = velocity / capacity;
  if (ratio <= 0.5) return 'bg-emerald-500';
  if (ratio <= 0.75) return 'bg-amber-500';
  if (ratio <= 1.0) return 'bg-orange-500';
  return 'bg-red-500';
}

export function splitSprintGroups(
  plan: SprintPlan | null,
  rows: DashboardSprintStoryRow[],
  unassignedRows: DashboardSprintStoryRow[],
  estimationMode: EstimationMode,
  hideEmptyGroups: boolean
): { backlogGroup: SprintRowsGroup; sprintGroups: SprintRowsGroup[] } {
  const rowsBySprint = new Map<string, DashboardSprintStoryRow[]>();
  rows.forEach((row) => {
    if (!row.sprintId) return;
    const list = rowsBySprint.get(row.sprintId) ?? [];
    list.push(row);
    rowsBySprint.set(row.sprintId, list);
  });

  const unresolvedUnassigned = plan != null ? unassignedRows : rows.filter((r) => !r.sprintId);

  const backlogGroup: SprintRowsGroup = {
    key: 'unassigned',
    label: 'Backlog',
    meta: 'Asigna historias con el selector Sprint o arrástralas a un sprint',
    rows: hideEmptyGroups && unresolvedUnassigned.length === 0 ? [] : unresolvedUnassigned,
    sprint: null,
    sprintIndex: null,
    colorClass: 'border-l-border',
    isUnassigned: true,
    velocitySp: unresolvedUnassigned.reduce(
      (sum, r) => sum + getEffortValue(r.estimation, estimationMode),
      0
    ),
  };

  const sprintGroups: SprintRowsGroup[] = [];

  if (plan) {
    plan.sprints.forEach((sprint, idx) => {
      const groupRows = rowsBySprint.get(sprint.id) ?? [];
      if (hideEmptyGroups && groupRows.length === 0) return;
      sprintGroups.push({
        key: sprint.id,
        label: `Sprint ${sprint.number}`,
        meta: [sprint.sprintGoal, formatDateRangeEs(sprint.startDate, sprint.endDate)]
          .filter(Boolean)
          .join(' · '),
        rows: groupRows,
        sprint,
        sprintIndex: idx,
        colorClass: SPRINT_COLORS[idx % SPRINT_COLORS.length],
        isUnassigned: false,
        velocitySp: sprint.velocitySp,
      });
    });
  }

  return { backlogGroup, sprintGroups };
}

export function partitionSprintGroups(sprintGroups: SprintRowsGroup[]): {
  activeAndPlanned: SprintRowsGroup[];
  completed: SprintRowsGroup[];
} {
  const activeAndPlanned: SprintRowsGroup[] = [];
  const completed: SprintRowsGroup[] = [];

  for (const group of sprintGroups) {
    const status = group.sprint ? getSprintStatus(group.sprint) : null;
    if (status === 'completed') {
      completed.push(group);
    } else {
      activeAndPlanned.push(group);
    }
  }

  return { activeAndPlanned, completed };
}
