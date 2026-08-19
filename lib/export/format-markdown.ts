/**
 * @fileoverview Genera documento Markdown del proyecto.
 */

import { MEMBER_ROLE_LABELS } from '@/lib/export/resolve-project-export';
import type { ProjectExportPayload, ProjectExportResult, ProjectExportStoryRow } from '@/lib/export/types';
import { slugifyExportFilename } from '@/lib/export/filename';
import { formatEffortTotal } from '@/lib/utils/estimation';

function formatDependencies(row: ProjectExportStoryRow, stories: ProjectExportStoryRow[]): string {
  if (row.dependencies.length === 0) return '_Sin dependencias_';

  return row.dependencies
    .map((dep) => {
      const prerequisite = stories.find((item) => item.storyId === dep.dependsOnStoryId);
      const title = prerequisite?.storyTitle ?? dep.dependsOnStoryId;
      return `- **${dep.dependsOnStoryId}** (${title})${dep.reason ? `: ${dep.reason}` : ''}`;
    })
    .join('\n');
}

function formatAcceptanceCriteria(criteria: string[]): string {
  if (criteria.length === 0) return '_Sin criterios definidos_';
  return criteria.map((criterion) => `- [ ] ${criterion}`).join('\n');
}

export function formatProjectAsMarkdown(payload: ProjectExportPayload): ProjectExportResult {
  const lines: string[] = [
    `# ${payload.projectName}`,
    '',
    `_Exportado desde Klarify · ${new Date(payload.exportedAt).toLocaleString('es-ES')}_`,
    '',
    '## Resumen del proyecto',
    '',
    '| Métrica | Valor |',
    '| --- | --- |',
    `| Épicas | ${payload.summary.epicCount} |`,
    `| Historias de usuario | ${payload.summary.storyCount} |`,
    `| ${payload.estimationMode === 'time' ? 'Tiempo total' : 'Story points totales'} | ${payload.summary.totalEffortLabel} |`,
    `| Historias estimadas | ${payload.summary.estimatedStoryCount} |`,
    `| Historias priorizadas | ${payload.summary.prioritizedStoryCount} |`,
    `| Sprints planificados | ${payload.summary.sprintCount} |`,
    `| Historias en sprints | ${payload.summary.plannedStoryCount} |`,
    `| Historias sin sprint | ${payload.summary.unassignedStoryCount} |`,
    `| Progreso del pipeline | ${payload.pipelineCompletionPercentage}% |`,
  ];

  if (payload.frameworkLabel) {
    lines.push(`| Framework de priorización | ${payload.frameworkLabel} |`);
  }

  if (payload.wishes.length > 0) {
    lines.push('', '## Deseos identificados (Agente 1)', '');
    for (const wish of payload.wishes) {
      lines.push(`- **${wish.id}**: ${wish.text}`);
    }
  }

  if (payload.sprints.length > 0) {
    lines.push('', '## Plan de sprints', '');
    for (const sprint of payload.sprints) {
      lines.push(
        `### Sprint ${sprint.number}: ${sprint.sprintGoal}`,
        '',
        `- **Período:** ${sprint.startDate} → ${sprint.endDate}`,
        `- **Velocidad:** ${formatEffortTotal(sprint.velocitySp, payload.estimationMode)}`,
        `- **Historias:** ${sprint.storyIds.join(', ') || '_Ninguna_'}`,
        ''
      );
    }
  }

  if (payload.unassignedStoryIds.length > 0) {
    lines.push('### Historias sin sprint asignado', '', payload.unassignedStoryIds.join(', '), '');
  }

  if (payload.dependencies.length > 0) {
    lines.push('## Dependencias entre historias', '');
    for (const dep of payload.dependencies) {
      lines.push(
        `- **${dep.storyId}** depende de **${dep.dependsOnStoryId}**${dep.reason ? `: ${dep.reason}` : ''}`
      );
    }
    lines.push('');
  }

  lines.push('## Backlog por épica', '');

  for (const epic of payload.epics) {
    lines.push(`### ${epic.id}: ${epic.title}`, '', epic.description, '');

    for (const story of epic.userStories) {
      const row = payload.stories.find((item) => item.storyId === story.id);
      if (!row) continue;

      lines.push(
        `#### ${row.storyId}: ${row.storyTitle}`,
        '',
        `**Tipo:** ${row.storyType}`,
        '',
        '**Descripción**',
        '',
        row.storyDescription,
        '',
        '**Criterios de aceptación**',
        '',
        formatAcceptanceCriteria(row.acceptanceCriteria),
        ''
      );

      const metadata: string[] = [];
      if (row.effortLabel) {
        metadata.push(
          `${payload.estimationMode === 'time' ? 'Tiempo' : 'Story Points'}: **${row.effortLabel}**`
        );
      }
      if (row.priorityLabel) metadata.push(`Prioridad: **${row.priorityLabel}**`);
      if (row.sprintNumber !== null) metadata.push(`Sprint: **${row.sprintNumber}** (${row.sprintGoal})`);
      if (row.kanbanStatusLabel) metadata.push(`Estado Kanban: **${row.kanbanStatusLabel}**`);
      if (row.assigneeName) metadata.push(`Asignado a: **${row.assigneeName}**`);
      if (row.sourceWishIds.length > 0) metadata.push(`Deseos origen: ${row.sourceWishIds.join(', ')}`);

      if (metadata.length > 0) {
        lines.push('**Metadatos**', '', metadata.map((item) => `- ${item}`).join('\n'), '');
      }

      if (row.estimationJustification) {
        lines.push('**Justificación de estimación**', '', row.estimationJustification, '');
      }

      if (row.priorityJustification) {
        lines.push('**Justificación de prioridad**', '', row.priorityJustification, '');
      }

      if (row.dependencies.length > 0) {
        lines.push('**Dependencias**', '', formatDependencies(row, payload.stories), '');
      }
    }
  }

  if (payload.members.length > 0) {
    lines.push('## Equipo', '', '| Nombre | Rol |', '| --- | --- |');
    for (const member of payload.members) {
      lines.push(`| ${member.displayName} | ${MEMBER_ROLE_LABELS[member.role]} |`);
    }
    lines.push('');
  }

  const baseName = slugifyExportFilename(payload.projectName);

  return {
    content: lines.join('\n'),
    mimeType: 'text/markdown;charset=utf-8',
    extension: 'md',
    filename: `${baseName}-klarify.md`,
  };
}
