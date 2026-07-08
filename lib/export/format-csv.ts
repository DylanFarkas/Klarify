/**
 * @fileoverview Genera CSV organizado con hojas lógicas (secciones) en un solo archivo.
 */

import { MEMBER_ROLE_LABELS } from '@/lib/export/resolve-project-export';
import type { ProjectExportPayload, ProjectExportResult } from '@/lib/export/types';
import { slugifyExportFilename } from '@/lib/export/filename';

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const normalized = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function toCsvRow(values: Array<string | number | null | undefined>): string {
  return values.map(escapeCsvValue).join(',');
}

function buildSummarySection(payload: ProjectExportPayload): string[] {
  const headers = ['seccion', 'campo', 'valor'];
  const rows: string[] = [toCsvRow(headers)];

  const summaryEntries: Array<[string, string | number]> = [
    ['proyecto', payload.projectName],
    ['exportado_en', payload.exportedAt],
    ['progreso_pipeline_pct', payload.pipelineCompletionPercentage],
    ['framework', payload.frameworkLabel ?? ''],
    ['epicas', payload.summary.epicCount],
    ['historias', payload.summary.storyCount],
    ['story_points_totales', payload.summary.totalStoryPoints],
    ['historias_estimadas', payload.summary.estimatedStoryCount],
    ['historias_priorizadas', payload.summary.prioritizedStoryCount],
    ['sprints', payload.summary.sprintCount],
    ['historias_en_sprints', payload.summary.plannedStoryCount],
    ['historias_sin_sprint', payload.summary.unassignedStoryCount],
  ];

  for (const [field, value] of summaryEntries) {
    rows.push(toCsvRow(['resumen', field, value]));
  }

  return rows;
}

function buildEpicsSection(payload: ProjectExportPayload): string[] {
  const headers = [
    'seccion',
    'epic_id',
    'epic_titulo',
    'epic_descripcion',
    'historias_count',
    'story_points_totales',
  ];
  const rows: string[] = [toCsvRow(headers)];

  for (const epic of payload.epics) {
    const epicStories = payload.stories.filter((row) => row.epicId === epic.id);
    const points = epicStories.reduce((sum, row) => sum + (row.storyPoints ?? 0), 0);
    rows.push(
      toCsvRow([
        'epica',
        epic.id,
        epic.title,
        epic.description,
        epicStories.length,
        points,
      ])
    );
  }

  return rows;
}

function buildSprintsSection(payload: ProjectExportPayload): string[] {
  const headers = [
    'seccion',
    'sprint_id',
    'sprint_numero',
    'sprint_objetivo',
    'fecha_inicio',
    'fecha_fin',
    'velocidad_sp',
    'historias_count',
    'historias_ids',
  ];
  const rows: string[] = [toCsvRow(headers)];

  for (const sprint of payload.sprints) {
    rows.push(
      toCsvRow([
        'sprint',
        sprint.id,
        sprint.number,
        sprint.sprintGoal,
        sprint.startDate,
        sprint.endDate,
        sprint.velocitySp,
        sprint.storyIds.length,
        sprint.storyIds.join(' | '),
      ])
    );
  }

  if (payload.unassignedStoryIds.length > 0) {
    rows.push(
      toCsvRow([
        'sprint',
        'sin_sprint',
        '',
        'Historias sin sprint asignado',
        '',
        '',
        '',
        payload.unassignedStoryIds.length,
        payload.unassignedStoryIds.join(' | '),
      ])
    );
  }

  return rows;
}

function buildStoriesSection(payload: ProjectExportPayload): string[] {
  const headers = [
    'seccion',
    'historia_id',
    'historia_titulo',
    'historia_descripcion',
    'criterios_aceptacion',
    'epic_id',
    'epic_titulo',
    'story_points',
    'justificacion_estimacion',
    'prioridad_categoria',
    'prioridad_etiqueta',
    'justificacion_prioridad',
    'sprint_numero',
    'sprint_objetivo',
    'sprint_inicio',
    'sprint_fin',
    'dependencias',
    'deseos_origen',
    'estado_kanban',
    'asignado_a',
  ];
  const rows: string[] = [toCsvRow(headers)];

  for (const row of payload.stories) {
    const dependencies = row.dependencies
      .map((dep) => `${dep.dependsOnStoryId}${dep.reason ? ` (${dep.reason})` : ''}`)
      .join(' | ');

    rows.push(
      toCsvRow([
        'historia',
        row.storyId,
        row.storyTitle,
        row.storyDescription,
        row.acceptanceCriteria.map((criterion, index) => `${index + 1}. ${criterion}`).join(' | '),
        row.epicId,
        row.epicTitle,
        row.storyPoints,
        row.estimationJustification,
        row.priorityCategory,
        row.priorityLabel,
        row.priorityJustification,
        row.sprintNumber,
        row.sprintGoal,
        row.sprintStartDate,
        row.sprintEndDate,
        dependencies,
        row.sourceWishIds.join(' | '),
        row.kanbanStatusLabel,
        row.assigneeName,
      ])
    );
  }

  return rows;
}

function buildWishesSection(payload: ProjectExportPayload): string[] {
  if (payload.wishes.length === 0) return [];

  const headers = ['seccion', 'deseo_id', 'deseo_texto', 'fuente', 'editado'];
  const rows: string[] = [toCsvRow(headers)];

  for (const wish of payload.wishes) {
    rows.push(toCsvRow(['deseo', wish.id, wish.text, wish.source, wish.isEdited ? 'si' : 'no']));
  }

  return rows;
}

function buildTeamSection(payload: ProjectExportPayload): string[] {
  if (payload.members.length === 0) return [];

  const headers = ['seccion', 'miembro_id', 'nombre', 'rol', 'email'];
  const rows: string[] = [toCsvRow(headers)];

  for (const member of payload.members) {
    rows.push(
      toCsvRow([
        'equipo',
        member.id,
        member.displayName,
        MEMBER_ROLE_LABELS[member.role],
        member.email ?? '',
      ])
    );
  }

  return rows;
}

export function formatProjectAsCsv(payload: ProjectExportPayload): ProjectExportResult {
  const sections = [
    ['# RESUMEN DEL PROYECTO'],
    buildSummarySection(payload),
    [''],
    ['# EPICAS'],
    buildEpicsSection(payload),
    [''],
    ['# SPRINTS'],
    buildSprintsSection(payload),
    [''],
    ['# HISTORIAS DE USUARIO'],
    buildStoriesSection(payload),
  ];

  if (payload.wishes.length > 0) {
    sections.push([''], ['# DESEOS'], buildWishesSection(payload));
  }

  if (payload.members.length > 0) {
    sections.push([''], ['# EQUIPO'], buildTeamSection(payload));
  }

  const content = sections.flat().join('\n');
  const baseName = slugifyExportFilename(payload.projectName);

  return {
    content,
    mimeType: 'text/csv;charset=utf-8',
    extension: 'csv',
    filename: `${baseName}-klarify.csv`,
  };
}
