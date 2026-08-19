/**
 * @fileoverview Serializa el proyecto a JSON estructurado.
 */

import type { ProjectExportPayload, ProjectExportResult } from '@/lib/export/types';
import { slugifyExportFilename } from '@/lib/export/filename';

export function formatProjectAsJson(payload: ProjectExportPayload): ProjectExportResult {
  const content = JSON.stringify(
    {
      meta: {
        exportedAt: payload.exportedAt,
        exportedFrom: 'Klarify',
        projectName: payload.projectName,
        pipelineCompletionPercentage: payload.pipelineCompletionPercentage,
        framework: payload.framework,
        frameworkLabel: payload.frameworkLabel,
        estimationMode: payload.estimationMode,
        summary: payload.summary,
      },
      wishes: payload.wishes,
      epics: payload.epics,
      estimations: payload.estimations,
      priorities: payload.priorities,
      sprintPlan: payload.plan
        ? {
            config: payload.plan.config,
            sprints: payload.sprints,
            dependencies: payload.dependencies,
            unassignedStoryIds: payload.unassignedStoryIds,
          }
        : null,
      stories: payload.stories,
      execution: payload.execution
        ? {
            initializedAt: payload.execution.initializedAt,
            members: payload.members,
            stories: payload.execution.stories,
          }
        : null,
    },
    null,
    2
  );

  const baseName = slugifyExportFilename(payload.projectName);

  return {
    content,
    mimeType: 'application/json;charset=utf-8',
    extension: 'json',
    filename: `${baseName}-klarify.json`,
  };
}
