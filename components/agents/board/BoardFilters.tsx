'use client';

import type { BoardFilters as BoardFiltersState } from '@/lib/board/board-utils';
import type { Epic } from '@/lib/types/agent-2';
import type { PlannedSprint } from '@/lib/types/agent-5';
import { getSprintStatus } from '@/lib/types/agent-5';
import type { ProjectMember } from '@/lib/types/execution';

interface BoardFiltersProps {
  filters: BoardFiltersState;
  sprints: PlannedSprint[];
  epics: Epic[];
  members: ProjectMember[];
  activeSprintId?: string | null;
  onChange: (patch: Partial<BoardFiltersState>) => void;
}

const controlClass =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-border-strong focus:outline-none';

export function BoardFilters({
  filters,
  sprints,
  epics,
  members,
  activeSprintId = null,
  onChange,
}: BoardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-35 flex-1 sm:max-w-xs">
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Buscar historias..."
          className={`w-full placeholder:text-subtle ${controlClass}`}
        />
      </div>

      <select
        value={filters.sprintFilter}
        onChange={(e) => onChange({ sprintFilter: e.target.value as BoardFiltersState['sprintFilter'] })}
        className={`cursor-pointer ${controlClass}`}
        aria-label="Filtrar por sprint"
      >
        <option value="all">Todo el backlog</option>
        <option value="unassigned">Sin sprint</option>
        {sprints.map((s) => {
          const status = getSprintStatus(s);
          const suffix =
            s.id === activeSprintId
              ? ' (activo)'
              : status === 'completed'
                ? ' (cerrado)'
                : '';
          return (
            <option key={s.id} value={s.id}>
              Sprint {s.number}
              {suffix}
            </option>
          );
        })}
      </select>

      <select
        value={filters.epicId}
        onChange={(e) => onChange({ epicId: e.target.value })}
        className={`cursor-pointer ${controlClass}`}
        aria-label="Filtrar por épica"
      >
        <option value="all">Todas las épicas</option>
        {epics.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title}
          </option>
        ))}
      </select>

      <select
        value={filters.assigneeId}
        onChange={(e) => onChange({ assigneeId: e.target.value as BoardFiltersState['assigneeId'] })}
        className={`cursor-pointer ${controlClass}`}
        aria-label="Filtrar por responsable"
      >
        <option value="all">Todos los responsables</option>
        <option value="unassigned">Sin asignar</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
