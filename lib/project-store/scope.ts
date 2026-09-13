/**
 * @fileoverview Alcance de lectura del workspace (API + cliente).
 */

import type { WorkspaceScope } from '@/lib/types/project-schema';
import { createEmptyWorkspace, type UserWorkspace } from '@/lib/types/workspace';
import { isTranscriptionResult, isSlimTranscription, toTranscriptionPointer, pointerToSlimResult } from '@/lib/artifacts/transcription-utils';

export function parseWorkspaceScope(raw: string | null): WorkspaceScope {
  if (raw === 'agent1' || raw === 'pipeline' || raw === 'full' || raw === 'shell') {
    return raw;
  }
  return 'shell';
}

export function scopeFromPathname(pathname: string | null | undefined): {
  scope: WorkspaceScope;
  agent?: string;
} {
  if (!pathname) return { scope: 'shell' };
  const agentMatch = pathname.match(/^\/agentes\/(\d+)/);
  if (agentMatch) {
    const agent = agentMatch[1];
    if (agent === '1') return { scope: 'agent1' };
    if (agent === '2' || agent === '3' || agent === '4' || agent === '5') {
      return { scope: 'pipeline', agent };
    }
  }
  return { scope: 'shell' };
}

export function applyWorkspaceScope(
  workspace: UserWorkspace,
  scope: WorkspaceScope,
  pipelineAgent?: string
): UserWorkspace {
  if (scope === 'full') return workspace;

  const slimTx = workspace.agent1.transcription;
  const pointerTx =
    slimTx && isTranscriptionResult(slimTx) && !isSlimTranscription(slimTx)
      ? pointerToSlimResult(toTranscriptionPointer(slimTx))
      : slimTx;

  if (scope === 'shell') {
    return {
      ...workspace,
      agent1: { ...workspace.agent1, transcription: pointerTx },
    };
  }

  if (scope === 'agent1') {
    return workspace;
  }

  if (scope === 'pipeline') {
    const empty = createEmptyWorkspace();
    return {
      ...workspace,
      agent1: { ...workspace.agent1, transcription: pipelineAgent === '2' ? workspace.agent1.transcription : pointerTx },
      agent2: pipelineAgent === '2' ? workspace.agent2 : { ...workspace.agent2, input: empty.agent2.input, epics: workspace.agent2.epics.length ? workspace.agent2.epics : [] },
    };
  }

  return workspace;
}

export function mergeScopedWorkspace(
  previous: UserWorkspace | null,
  incoming: UserWorkspace,
  scope: WorkspaceScope
): UserWorkspace {
  if (!previous || scope === 'full') return incoming;

  const keepHydrated = <T extends { status?: string }>(
    prevSlice: T,
    nextSlice: T,
    isHydrated: (value: T) => boolean
  ): T => {
    if (isHydrated(nextSlice)) return nextSlice;
    if (isHydrated(prevSlice) && prevSlice.status === nextSlice.status) return prevSlice;
    return nextSlice;
  };

  return {
    ...incoming,
    agent1: {
      ...incoming.agent1,
      transcription:
        incoming.agent1.transcription &&
        isTranscriptionResult(incoming.agent1.transcription) &&
        !isSlimTranscription(incoming.agent1.transcription)
          ? incoming.agent1.transcription
          : previous.agent1.transcription &&
              isTranscriptionResult(previous.agent1.transcription) &&
              !isSlimTranscription(previous.agent1.transcription)
            ? previous.agent1.transcription
            : incoming.agent1.transcription,
    },
    agent2: keepHydrated(
      previous.agent2,
      incoming.agent2,
      (agent) => agent.epics.length > 0 || agent.input != null
    ),
    agent3: keepHydrated(
      previous.agent3,
      incoming.agent3,
      (agent) => agent.input != null || Object.keys(agent.estimations).length > 0
    ),
    agent4: keepHydrated(
      previous.agent4,
      incoming.agent4,
      (agent) => agent.input != null || Object.keys(agent.priorities).length > 0
    ),
    agent5: keepHydrated(
      previous.agent5,
      incoming.agent5,
      (agent) => agent.input != null || agent.plan != null
    ),
    pipeline: {
      agent2Input: incoming.pipeline.agent2Input ?? previous.pipeline.agent2Input,
      agent3Input: incoming.pipeline.agent3Input ?? previous.pipeline.agent3Input,
      agent4Input: incoming.pipeline.agent4Input ?? previous.pipeline.agent4Input,
      agent5Input: incoming.pipeline.agent5Input ?? previous.pipeline.agent5Input,
      agent6Input: incoming.pipeline.agent6Input ?? previous.pipeline.agent6Input,
    },
  };
}
