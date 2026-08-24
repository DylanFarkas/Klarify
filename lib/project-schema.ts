/**
 * @fileoverview Normalización del workspace en memoria y helpers de schema.
 */

import type { Agent2State } from '@/lib/types/agent-2';
import type { Agent3State } from '@/lib/types/agent-3';
import type { Agent4State } from '@/lib/types/agent-4';
import type { Agent5State } from '@/lib/types/agent-5';
import type { ProjectDocument } from '@/lib/types/project';
import {
  SCHEMA_VERSION_MONOLITH,
  type SchemaVersion,
  type WorkspaceMeta,
} from '@/lib/types/project-schema';
import { createEmptyWorkspace, type UserWorkspace } from '@/lib/types/workspace';
import { normalizeSprintPlan } from '@/lib/utils/sprint-plan-mutations';
import { normalizeEpics } from '@/lib/utils/work-item-validation';

const EMPTY_AGENT3 = {
  input: null,
  estimations: {},
  status: 'idle' as const,
  error: null,
};

const EMPTY_AGENT4 = {
  input: null,
  priorities: {},
  framework: 'moscow' as const,
  status: 'idle' as const,
  error: null,
};

const EMPTY_AGENT5 = {
  input: null,
  plan: null,
  status: 'idle' as const,
  error: null,
};

function normalizeAgentEpics<T extends { epics?: import('@/lib/types/agent-2').Epic[] } | null>(
  value: T
): T {
  if (!value || !Array.isArray(value.epics)) return value;
  return { ...value, epics: normalizeEpics(value.epics) };
}

export function normalizeWorkspace(ws: Partial<UserWorkspace> | undefined): UserWorkspace {
  const empty = createEmptyWorkspace();
  if (!ws) return empty;

  const agent2 = {
    ...empty.agent2,
    ...(ws.agent2 ?? {}),
    epics: normalizeEpics(ws.agent2?.epics ?? empty.agent2.epics),
  };

  return {
    agent1: { ...empty.agent1, ...(ws.agent1 ?? {}) },
    agent2,
    agent3: {
      ...EMPTY_AGENT3,
      ...(ws.agent3 ?? {}),
      input: normalizeAgentEpics(ws.agent3?.input ?? null),
      estimations: { ...EMPTY_AGENT3.estimations, ...(ws.agent3?.estimations ?? {}) },
    },
    agent4: {
      ...EMPTY_AGENT4,
      ...(ws.agent4 ?? {}),
      input: normalizeAgentEpics(ws.agent4?.input ?? null),
      priorities: { ...EMPTY_AGENT4.priorities, ...(ws.agent4?.priorities ?? {}) },
    },
    agent5: {
      ...EMPTY_AGENT5,
      ...(ws.agent5 ?? {}),
      input: normalizeAgentEpics(ws.agent5?.input ?? null),
      plan: ws.agent5?.plan ? normalizeSprintPlan(ws.agent5.plan) : null,
    },
    pipeline: {
      agent2Input: ws.pipeline?.agent2Input ?? null,
      agent3Input: normalizeAgentEpics(ws.pipeline?.agent3Input ?? null),
      agent4Input: normalizeAgentEpics(ws.pipeline?.agent4Input ?? null),
      agent5Input: normalizeAgentEpics(ws.pipeline?.agent5Input ?? null),
      agent6Input: ws.pipeline?.agent6Input
        ? {
            ...ws.pipeline.agent6Input,
            epics: normalizeEpics(ws.pipeline.agent6Input.epics ?? []),
            plan: ws.pipeline.agent6Input.plan
              ? normalizeSprintPlan(ws.pipeline.agent6Input.plan)
              : ws.pipeline.agent6Input.plan,
          }
        : null,
    },
    execution: ws.execution ?? null,
    stack:
      ws.stack != null
        ? {
            ...ws.stack,
            status: ws.stack.status === 'proposed' ? 'saved' : ws.stack.status,
          }
        : null,
  };
}

export function resolveSchemaVersion(data: ProjectDocument | FirebaseFirestore.DocumentData | undefined): SchemaVersion {
  const raw = (data as ProjectDocument | undefined)?.schemaVersion;
  if (raw === 2 || raw === 3 || raw === 4) return raw;
  return SCHEMA_VERSION_MONOLITH;
}

export function countStories(epics: Array<{ userStories?: unknown[] }> | null | undefined): number {
  if (!epics) return 0;
  return epics.reduce((sum, epic) => sum + (epic.userStories?.length ?? 0), 0);
}

export function isHydratedAgent2(agent: Agent2State | undefined): boolean {
  return Boolean(agent && (agent.epics.length > 0 || agent.input != null));
}

export function isHydratedAgent3(agent: Agent3State | undefined): boolean {
  return Boolean(
    agent && (agent.input != null || Object.keys(agent.estimations ?? {}).length > 0)
  );
}

export function isHydratedAgent4(agent: Agent4State | undefined): boolean {
  return Boolean(agent && (agent.input != null || Object.keys(agent.priorities ?? {}).length > 0));
}

export function isHydratedAgent5(agent: Agent5State | undefined): boolean {
  return Boolean(agent && (agent.input != null || agent.plan != null));
}

export function workspaceMetaFromWorkspace(workspace: UserWorkspace): WorkspaceMeta {
  const liveEpics =
    workspace.pipeline.agent6Input?.epics ??
    workspace.agent5.input?.epics ??
    workspace.agent4.input?.epics ??
    workspace.agent3.input?.epics ??
    workspace.agent2.epics;

  return {
    agent1: {
      status: workspace.agent1.status,
      error: workspace.agent1.error,
      file: workspace.agent1.file,
      discovery: workspace.agent1.discovery,
      enrichedContext: workspace.agent1.enrichedContext,
      wishes: workspace.agent1.wishes,
      transcription: null,
    },
    agent2: {
      status: workspace.agent2.status,
      error: workspace.agent2.error,
      epicCount: workspace.agent2.epics.length || liveEpics.length,
      storyCount: countStories(workspace.agent2.epics.length ? workspace.agent2.epics : liveEpics),
    },
    agent3: {
      status: workspace.agent3.status,
      error: workspace.agent3.error,
      estimationMode: workspace.agent3.estimationMode ?? null,
      epicCount: workspace.agent3.input?.epics.length ?? liveEpics.length,
      storyCount: countStories(workspace.agent3.input?.epics ?? liveEpics),
    },
    agent4: {
      status: workspace.agent4.status,
      error: workspace.agent4.error,
      framework: workspace.agent4.framework,
      epicCount: workspace.agent4.input?.epics.length ?? liveEpics.length,
      storyCount: countStories(workspace.agent4.input?.epics ?? liveEpics),
    },
    agent5: {
      status: workspace.agent5.status,
      error: workspace.agent5.error,
    },
    executionInitializedAt: workspace.execution?.initializedAt ?? null,
    sprintFilter: workspace.execution?.sprintFilter ?? 'all',
    members: workspace.execution?.members ?? [],
    stack: workspace.stack ?? null,
  };
}
