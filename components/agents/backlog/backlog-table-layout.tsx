import type { EstimationMode } from '@/lib/types/agent-3';

/** Anchos compartidos para tablas de backlog / sprint. */
export const BACKLOG_TABLE_MIN_WIDTH = 'min-w-[72rem]';

export function BacklogStoriesTableColGroup({
  estimationMode,
}: {
  estimationMode: EstimationMode;
}) {
  return (
    <colgroup>
      {/* ID */}
      <col className="hidden @3xl:table-column" style={{ width: '5.5rem' }} />
      {/* HU */}
      <col style={{ width: '22rem' }} />
      {/* Épica */}
      <col className="hidden @lg:table-column" style={{ width: '11rem' }} />
      {/* SP / Tiempo */}
      <col style={{ width: estimationMode === 'time' ? '5.5rem' : '4.25rem' }} />
      {/* Prioridad */}
      <col style={{ width: '5.75rem' }} />
      {/* Sprint */}
      <col className="hidden @lg:table-column" style={{ width: '6.75rem' }} />
      {/* Estado */}
      <col className="hidden @lg:table-column" style={{ width: '7.25rem' }} />
      {/* Asignado */}
      <col className="hidden @2xl:table-column" style={{ width: '2.75rem' }} />
      {/* Acciones */}
      <col style={{ width: '4.75rem' }} />
    </colgroup>
  );
}

export function backlogTableClassName() {
  return `${BACKLOG_TABLE_MIN_WIDTH} w-full table-fixed border-collapse text-left`;
}

/** Clases de celda por columna — mantener thead/tbody alineados. */
export const backlogTableCell = {
  id: 'hidden px-3 py-2.5 align-middle @3xl:table-cell @3xl:px-4',
  hu: 'px-3 py-2.5 align-middle @lg:px-4 @3xl:pl-4',
  epic: 'hidden px-3 py-2.5 align-middle @lg:table-cell @lg:px-3',
  sp: 'px-2 py-2.5 align-middle @lg:px-2.5',
  priority: 'px-2 py-2.5 align-middle @lg:px-2.5',
  sprint: 'hidden px-2 py-2.5 align-middle @lg:table-cell @lg:px-2.5',
  status: 'hidden px-2 py-2.5 align-middle @lg:table-cell @lg:px-2.5',
  assignee: 'hidden px-2 py-2.5 align-middle @2xl:table-cell @2xl:px-2.5',
  actions: 'px-2 py-2.5 align-middle @lg:px-2.5',
} as const;

export const backlogTableHeadCell = {
  id: 'hidden px-3 py-2 @3xl:table-cell @3xl:px-4',
  hu: 'px-3 py-2 @lg:px-4',
  epic: 'hidden px-3 py-2 @lg:table-cell @lg:px-3',
  sp: 'px-2 py-2 @lg:px-2.5',
  priority: 'px-2 py-2 @lg:px-2.5',
  sprint: 'hidden px-2 py-2 @lg:table-cell @lg:px-2.5',
  status: 'hidden px-2 py-2 @lg:table-cell @lg:px-2.5',
  assignee: 'hidden px-2 py-2 @2xl:table-cell @2xl:px-2.5',
  actions: 'px-2 py-2 text-right @lg:px-2.5',
} as const;
