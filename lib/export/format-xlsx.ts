/**
 * @fileoverview Genera Excel (.xlsx) multi-hoja con formato visual pulido.
 */

import type { Cell, CellObject, SheetData, Value } from 'write-excel-file/browser';
import { MEMBER_ROLE_LABELS } from '@/lib/export/resolve-project-export';
import type { ProjectExportPayload, ProjectExportResult } from '@/lib/export/types';
import { slugifyExportFilename } from '@/lib/export/filename';
import { formatEffortTotal } from '@/lib/utils/estimation';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Paleta alineada a Klarify (claro / primary blue). */
const COLORS = {
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  white: '#ffffff',
  primary: '#005bbf',
  primarySoft: '#e8f1fb',
  rowAlt: '#f8fafc',
  border: '#cbd5e1',
  success: '#166534',
  successBg: '#dcfce7',
  warning: '#92400e',
  warningBg: '#fef3c7',
  danger: '#991b1b',
  dangerBg: '#fee2e2',
  info: '#1e40af',
  infoBg: '#dbeafe',
  neutral: '#475569',
  neutralBg: '#f1f5f9',
} as const;

const BORDER = {
  borderStyle: 'thin' as const,
  borderColor: COLORS.border,
};

type Align = 'left' | 'center' | 'right';

interface ColumnDef {
  key: string;
  label: string;
  width: number;
  align?: Align;
  wrap?: boolean;
}

function emptyValue(value: string | number | null | undefined): string | number {
  if (value === null || value === undefined) return '';
  return value;
}

function titleRow(title: string, columnCount: number, subtitle?: string): SheetData {
  const span = Math.max(columnCount, 2);
  const spanned = Array.from({ length: span - 1 }, () => null);
  const value = subtitle ? `${title}\n${subtitle}` : title;

  return [
    [
      {
        value,
        fontWeight: 'bold',
        fontSize: 14,
        fontFamily: 'Calibri',
        textColor: COLORS.white,
        backgroundColor: COLORS.ink,
        align: 'left',
        alignVertical: 'center',
        wrap: true,
        height: subtitle ? 40 : 28,
        columnSpan: span,
      },
      ...spanned,
    ],
  ];
}

function headerRow(columns: ColumnDef[]): Cell[] {
  return columns.map((column) => ({
    value: column.label,
    fontWeight: 'bold',
    fontSize: 11,
    fontFamily: 'Calibri',
    textColor: COLORS.white,
    backgroundColor: COLORS.primary,
    align: column.align ?? 'left',
    alignVertical: 'center',
    height: 24,
    ...BORDER,
  }));
}

function dataCell(
  value: string | number,
  options: {
    rowIndex: number;
    align?: Align;
    wrap?: boolean;
    fontWeight?: 'bold';
    textColor?: string;
    backgroundColor?: string;
    height?: number;
  }
): CellObject {
  const zebra = options.rowIndex % 2 === 1 ? COLORS.rowAlt : COLORS.white;

  return {
    value: value as Value,
    type: typeof value === 'number' ? Number : String,
    fontSize: 10,
    fontFamily: 'Calibri',
    textColor: options.textColor ?? COLORS.body,
    backgroundColor: options.backgroundColor ?? zebra,
    fontWeight: options.fontWeight,
    align: options.align ?? 'left',
    alignVertical: options.wrap ? 'top' : 'center',
    wrap: options.wrap,
    height: options.height,
    ...BORDER,
  };
}

function priorityStyle(category: string | null, label: string | null): {
  textColor: string;
  backgroundColor: string;
  fontWeight?: 'bold';
} {
  const key = `${category ?? ''} ${label ?? ''}`.toLowerCase();

  if (/(must|crítica|critica|alta|high|p0)/.test(key)) {
    return { textColor: COLORS.danger, backgroundColor: COLORS.dangerBg, fontWeight: 'bold' };
  }
  if (/(should|media|medium|p1)/.test(key)) {
    return { textColor: COLORS.warning, backgroundColor: COLORS.warningBg, fontWeight: 'bold' };
  }
  if (/(could|baja|low|p2)/.test(key)) {
    return { textColor: COLORS.info, backgroundColor: COLORS.infoBg };
  }
  if (/(won'?t|won't|descart|later|p3)/.test(key)) {
    return { textColor: COLORS.neutral, backgroundColor: COLORS.neutralBg };
  }

  return { textColor: COLORS.body, backgroundColor: COLORS.neutralBg };
}

function kanbanStyle(status: string | null): {
  textColor: string;
  backgroundColor: string;
} {
  const key = (status ?? '').toLowerCase();

  if (/(hecho|done|complet|closed)/.test(key)) {
    return { textColor: COLORS.success, backgroundColor: COLORS.successBg };
  }
  if (/(progreso|progress|doing|active)/.test(key)) {
    return { textColor: COLORS.info, backgroundColor: COLORS.infoBg };
  }
  if (/(review|revisión|revision)/.test(key)) {
    return { textColor: COLORS.warning, backgroundColor: COLORS.warningBg };
  }
  if (/(backlog|todo|pendiente|por hacer)/.test(key)) {
    return { textColor: COLORS.neutral, backgroundColor: COLORS.neutralBg };
  }

  return { textColor: COLORS.body, backgroundColor: COLORS.white };
}

function buildTableSheet(
  columns: ColumnDef[],
  rawRows: Array<Array<string | number>>,
  options?: {
    emphasizeColumn?: (columnKey: string, value: string | number, rowValues: Array<string | number>) => {
      textColor?: string;
      backgroundColor?: string;
      fontWeight?: 'bold';
    } | null;
  }
): { data: SheetData; columns: Array<{ width: number }> } {
  const dataRows: SheetData = rawRows.map((values, rowIndex) =>
    values.map((value, colIndex) => {
      const column = columns[colIndex];
      const emphasis = options?.emphasizeColumn?.(column.key, value, values) ?? null;
      const isLong = column.wrap && String(value).length > 80;

      return dataCell(value, {
        rowIndex,
        align: column.align,
        wrap: column.wrap,
        height: isLong ? 48 : undefined,
        fontWeight: emphasis?.fontWeight,
        textColor: emphasis?.textColor,
        backgroundColor: emphasis?.backgroundColor,
      });
    })
  );

  return {
    data: [headerRow(columns), ...dataRows],
    columns: columns.map((column) => ({ width: column.width })),
  };
}

function buildSummarySheet(payload: ProjectExportPayload): {
  data: SheetData;
  columns: Array<{ width: number }>;
  stickyRowsCount: number;
} {
  const entries: Array<[string, string | number, boolean?]> = [
    ['Proyecto', payload.projectName, true],
    ['Exportado el', payload.exportedAt],
    ['Progreso del pipeline', `${payload.pipelineCompletionPercentage}%`, true],
    ['Framework de priorización', payload.frameworkLabel ?? '—'],
    ['Épicas', payload.summary.epicCount, true],
    ['Historias de usuario', payload.summary.storyCount, true],
    [
      payload.estimationMode === 'time' ? 'Tiempo total' : 'Story points totales',
      payload.summary.totalEffortLabel,
      true,
    ],
    ['Historias estimadas', payload.summary.estimatedStoryCount],
    ['Historias priorizadas', payload.summary.prioritizedStoryCount],
    ['Sprints planificados', payload.summary.sprintCount, true],
    ['Historias en sprints', payload.summary.plannedStoryCount],
    ['Historias sin sprint', payload.summary.unassignedStoryCount],
  ];

  const columns: ColumnDef[] = [
    { key: 'campo', label: 'Métrica', width: 32 },
    { key: 'valor', label: 'Valor', width: 42 },
  ];

  const dataRows: SheetData = entries.map(([label, value, highlight], rowIndex) => {
    const zebra = rowIndex % 2 === 1 ? COLORS.rowAlt : COLORS.white;
    return [
      {
        value: label,
        fontSize: 10,
        fontFamily: 'Calibri',
        fontWeight: 'bold',
        textColor: COLORS.ink,
        backgroundColor: COLORS.primarySoft,
        alignVertical: 'center',
        ...BORDER,
      },
      {
        value: value as Value,
        type: typeof value === 'number' ? Number : String,
        fontSize: highlight ? 12 : 10,
        fontFamily: 'Calibri',
        fontWeight: highlight ? 'bold' : undefined,
        textColor: highlight ? COLORS.primary : COLORS.body,
        backgroundColor: zebra,
        alignVertical: 'center',
        ...BORDER,
      },
    ];
  });

  return {
    data: [
      ...titleRow(
        `Klarify · ${payload.projectName}`,
        2,
        `Exportación del proyecto · ${payload.exportedAt.slice(0, 10)}`
      ),
      [
        {
          value: '',
          backgroundColor: COLORS.white,
          height: 8,
          columnSpan: 2,
        },
        null,
      ],
      headerRow(columns),
      ...dataRows,
    ],
    columns: columns.map((column) => ({ width: column.width })),
    // Banner (1) + espacio (1) + cabecera → congelar hasta la cabecera de métricas.
    stickyRowsCount: 3,
  };
}

function buildEpicsSheet(payload: ProjectExportPayload): {
  data: SheetData;
  columns: Array<{ width: number }>;
} {
  const columns: ColumnDef[] = [
    { key: 'id', label: 'ID', width: 12, align: 'center' },
    { key: 'titulo', label: 'Épica', width: 28 },
    { key: 'descripcion', label: 'Descripción', width: 52, wrap: true },
    { key: 'historias', label: 'Historias', width: 12, align: 'center' },
    { key: 'sp', label: payload.estimationMode === 'time' ? 'Tiempo' : 'Story points', width: 14, align: 'center' },
  ];

  const rawRows = payload.epics.map((epic) => {
    const epicStories = payload.stories.filter((row) => row.epicId === epic.id);
    const effort = epicStories.reduce((sum, row) => sum + row.effortValue, 0);
    return [
      epic.id,
      epic.title,
      epic.description,
      epicStories.length,
      formatEffortTotal(effort, payload.estimationMode),
    ];
  });

  const table = buildTableSheet(columns, rawRows);

  return {
    data: [
      ...titleRow('Épicas', columns.length, `${payload.epics.length} épicas en el backlog`),
      ...table.data,
    ],
    columns: table.columns,
  };
}

function buildSprintsSheet(payload: ProjectExportPayload): {
  data: SheetData;
  columns: Array<{ width: number }>;
} {
  const columns: ColumnDef[] = [
    { key: 'id', label: 'ID', width: 14, align: 'center' },
    { key: 'numero', label: 'Nº', width: 8, align: 'center' },
    { key: 'objetivo', label: 'Objetivo', width: 40, wrap: true },
    { key: 'inicio', label: 'Inicio', width: 12, align: 'center' },
    { key: 'fin', label: 'Fin', width: 12, align: 'center' },
    { key: 'velocidad', label: payload.estimationMode === 'time' ? 'Velocidad' : 'Velocidad (SP)', width: 14, align: 'center' },
    { key: 'count', label: 'Historias', width: 12, align: 'center' },
    { key: 'ids', label: 'IDs de historias', width: 36, wrap: true },
  ];

  const rawRows: Array<Array<string | number>> = payload.sprints.map((sprint) => [
    sprint.id,
    sprint.number,
    sprint.sprintGoal,
    sprint.startDate,
    sprint.endDate,
    formatEffortTotal(sprint.velocitySp, payload.estimationMode),
    sprint.storyIds.length,
    sprint.storyIds.join(' · '),
  ]);

  if (payload.unassignedStoryIds.length > 0) {
    rawRows.push([
      'sin_sprint',
      '',
      'Historias sin sprint asignado',
      '',
      '',
      '',
      payload.unassignedStoryIds.length,
      payload.unassignedStoryIds.join(' · '),
    ]);
  }

  const table = buildTableSheet(columns, rawRows);

  return {
    data: [
      ...titleRow(
        'Sprints',
        columns.length,
        `${payload.sprints.length} sprints planificados`
      ),
      ...table.data,
    ],
    columns: table.columns,
  };
}

function buildStoriesSheet(payload: ProjectExportPayload): {
  data: SheetData;
  columns: Array<{ width: number }>;
} {
  const columns: ColumnDef[] = [
    { key: 'id', label: 'ID', width: 11, align: 'center' },
    { key: 'tipo', label: 'Tipo', width: 10, align: 'center' },
    { key: 'titulo', label: 'Historia', width: 28, wrap: true },
    { key: 'descripcion', label: 'Descripción', width: 40, wrap: true },
    { key: 'criterios', label: 'Criterios de aceptación', width: 42, wrap: true },
    { key: 'epic_id', label: 'Épica ID', width: 12, align: 'center' },
    { key: 'epic', label: 'Épica', width: 22 },
    { key: 'sp', label: payload.estimationMode === 'time' ? 'Tiempo' : 'SP', width: 12, align: 'center' },
    { key: 'est_just', label: 'Justificación estimación', width: 28, wrap: true },
    { key: 'prio_cat', label: 'Prioridad', width: 14, align: 'center' },
    { key: 'prio_label', label: 'Etiqueta', width: 14, align: 'center' },
    { key: 'prio_just', label: 'Justificación prioridad', width: 28, wrap: true },
    { key: 'sprint_n', label: 'Sprint', width: 10, align: 'center' },
    { key: 'sprint_goal', label: 'Objetivo sprint', width: 26, wrap: true },
    { key: 'sprint_start', label: 'Inicio', width: 12, align: 'center' },
    { key: 'sprint_end', label: 'Fin', width: 12, align: 'center' },
    { key: 'deps', label: 'Dependencias', width: 26, wrap: true },
    { key: 'wishes', label: 'Deseos origen', width: 18 },
    { key: 'kanban', label: 'Estado', width: 14, align: 'center' },
    { key: 'assignee', label: 'Asignado a', width: 18 },
    { key: 'subtasks', label: 'Subtareas', width: 42, wrap: true },
  ];

  const rawRows = payload.stories.map((row) => {
    const dependencies = row.dependencies
      .map((dep) => `${dep.dependsOnStoryId}${dep.reason ? ` (${dep.reason})` : ''}`)
      .join(' · ');

    return [
      row.storyId,
      row.storyType,
      row.storyTitle,
      row.storyDescription,
      row.acceptanceCriteria.map((criterion, index) => `${index + 1}. ${criterion}`).join('\n'),
      row.epicId,
      row.epicTitle,
      emptyValue(row.effortLabel),
      emptyValue(row.estimationJustification),
      emptyValue(row.priorityCategory),
      emptyValue(row.priorityLabel),
      emptyValue(row.priorityJustification),
      emptyValue(row.sprintNumber),
      emptyValue(row.sprintGoal),
      emptyValue(row.sprintStartDate),
      emptyValue(row.sprintEndDate),
      dependencies,
      row.sourceWishIds.join(' · '),
      emptyValue(row.kanbanStatusLabel),
      emptyValue(row.assigneeName),
      row.subtasks
        .map((subtask) => `${subtask.done ? '[x]' : '[ ]'} ${subtask.id} ${subtask.title}`)
        .join('\n'),
    ];
  });

  const table = buildTableSheet(columns, rawRows, {
    emphasizeColumn: (key, value, rowValues) => {
      if (key === 'prio_cat' || key === 'prio_label') {
        const category = String(rowValues[8] ?? '');
        const label = String(rowValues[9] ?? '');
        if (!value) return null;
        return priorityStyle(category, label);
      }
      if (key === 'kanban' && value) {
        return kanbanStyle(String(value));
      }
      if (key === 'sp' && value) {
        return {
          textColor: COLORS.primary,
          backgroundColor: COLORS.primarySoft,
          fontWeight: 'bold',
        };
      }
      return null;
    },
  });

  return {
    data: [
      ...titleRow(
        'Historias de usuario',
        columns.length,
        `${payload.stories.length} historias · ${payload.summary.totalEffortLabel}`
      ),
      ...table.data,
    ],
    columns: table.columns,
  };
}

function buildWishesSheet(payload: ProjectExportPayload): {
  data: SheetData;
  columns: Array<{ width: number }>;
} | null {
  if (payload.wishes.length === 0) return null;

  const columns: ColumnDef[] = [
    { key: 'id', label: 'ID', width: 14, align: 'center' },
    { key: 'texto', label: 'Deseo', width: 56, wrap: true },
    { key: 'fuente', label: 'Fuente', width: 14, align: 'center' },
    { key: 'editado', label: 'Editado', width: 12, align: 'center' },
  ];

  const rawRows = payload.wishes.map((wish) => [
    wish.id,
    wish.text,
    wish.source,
    wish.isEdited ? 'Sí' : 'No',
  ]);

  const table = buildTableSheet(columns, rawRows, {
    emphasizeColumn: (key, value) => {
      if (key === 'editado' && value === 'Sí') {
        return { textColor: COLORS.warning, backgroundColor: COLORS.warningBg, fontWeight: 'bold' };
      }
      return null;
    },
  });

  return {
    data: [
      ...titleRow('Deseos', columns.length, `${payload.wishes.length} deseos capturados`),
      ...table.data,
    ],
    columns: table.columns,
  };
}

function buildTeamSheet(payload: ProjectExportPayload): {
  data: SheetData;
  columns: Array<{ width: number }>;
} | null {
  if (payload.members.length === 0) return null;

  const columns: ColumnDef[] = [
    { key: 'id', label: 'ID', width: 16, align: 'center' },
    { key: 'nombre', label: 'Nombre', width: 26 },
    { key: 'rol', label: 'Rol', width: 18, align: 'center' },
    { key: 'email', label: 'Email', width: 32 },
  ];

  const rawRows = payload.members.map((member) => [
    member.id,
    member.displayName,
    MEMBER_ROLE_LABELS[member.role],
    member.email ?? '',
  ]);

  const table = buildTableSheet(columns, rawRows, {
    emphasizeColumn: (key) => {
      if (key === 'rol') {
        return {
          textColor: COLORS.primary,
          backgroundColor: COLORS.primarySoft,
          fontWeight: 'bold',
        };
      }
      return null;
    },
  });

  return {
    data: [
      ...titleRow('Equipo', columns.length, `${payload.members.length} miembros`),
      ...table.data,
    ],
    columns: table.columns,
  };
}

function sheetOptions(
  name: string,
  built: { data: SheetData; columns: Array<{ width: number }>; stickyRowsCount?: number },
  landscape = false
) {
  return {
    data: built.data,
    sheet: name,
    columns: built.columns,
    stickyRowsCount: built.stickyRowsCount ?? 2,
    zoomScale: 1.1,
    ...(landscape ? { orientation: 'landscape' as const } : {}),
  };
}

export async function formatProjectAsXlsx(
  payload: ProjectExportPayload
): Promise<ProjectExportResult> {
  const writeXlsxFile = (await import('write-excel-file/browser')).default;

  const summary = buildSummarySheet(payload);
  const epics = buildEpicsSheet(payload);
  const sprints = buildSprintsSheet(payload);
  const stories = buildStoriesSheet(payload);
  const wishes = buildWishesSheet(payload);
  const team = buildTeamSheet(payload);

  const sheets = [
    sheetOptions('Resumen', summary),
    sheetOptions('Épicas', epics),
    sheetOptions('Sprints', sprints),
    sheetOptions('Historias', stories, true),
  ];

  if (wishes) {
    sheets.push(sheetOptions('Deseos', wishes));
  }

  if (team) {
    sheets.push(sheetOptions('Equipo', team));
  }

  const blob = await writeXlsxFile(sheets, {
    fontFamily: 'Calibri',
    fontSize: 10,
  }).toBlob();

  const baseName = slugifyExportFilename(payload.projectName);

  return {
    blob,
    mimeType: XLSX_MIME,
    extension: 'xlsx',
    filename: `${baseName}-klarify.xlsx`,
  };
}
