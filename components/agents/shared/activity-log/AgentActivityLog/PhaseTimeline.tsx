'use client';

import { useMemo } from 'react';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import type { ActivityPhaseGroup } from '@/lib/utils/agent-activity-groups';
import { ActionLine } from './ActionLine';
import { DoneStepsSummary } from './DoneStepsSummary';
import { ReasoningLoader } from './ReasoningLoader';
import { ThoughtBlock } from './ThoughtBlock';

interface PhaseTimelineProps {
  group: ActivityPhaseGroup;
  variant?: 'default' | 'live';
}

export function PhaseTimeline({ group, variant = 'default' }: PhaseTimelineProps) {
  const { showModelReasoning } = useWorkspaceSettings();
  const { timeline } = group;
  const isLive = variant === 'live';

  const { doneActions, activeAction, activeThought } = useMemo(() => {
    const actions = timeline
      .filter((item) => item.type === 'action')
      .map((item) => item.entry);
    const thoughts = timeline
      .filter((item) => item.type === 'thought')
      .map((item) => item.entry);

    return {
      doneActions: actions.filter((a) => a.status === 'done'),
      activeAction: actions.find((a) => a.status === 'running' || a.status === 'error'),
      activeThought: thoughts.find((t) => t.endedAt === undefined) ?? thoughts.at(-1),
    };
  }, [timeline]);

  if (timeline.length === 0) {
    if (!showModelReasoning && isLive) {
      return (
        <div className="flex min-h-0 flex-1 flex-col pl-3">
          <ReasoningLoader fillAvailable />
        </div>
      );
    }
    return null;
  }

  const collapseDone = isLive && doneActions.length > 0 && (activeAction || activeThought);

  const showThought =
    showModelReasoning &&
    activeThought &&
    (activeThought.text.trim().length > 0 || !activeAction || activeThought.endedAt !== undefined);

  const isThinking =
    activeThought !== undefined && activeThought.endedAt === undefined;

  const showReasoningLoader = !showModelReasoning && isThinking;

  return (
    <div
      className={[
        'relative pl-3',
        isLive ? 'flex min-h-0 flex-1 flex-col' : '',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className="absolute bottom-1 left-0 top-1 w-px bg-border/80"
      />

      <div
        className={[
          'flex flex-col gap-3',
          isLive ? 'min-h-0 flex-1' : '',
        ].join(' ')}
      >
        {doneActions.length > 0 && (
          <div className="shrink-0">
            {collapseDone ? (
              <DoneStepsSummary actions={doneActions} variant={variant} />
            ) : (
              doneActions.map((action) => (
                <ActionLine key={action.id} entry={action} variant={variant} compact muted />
              ))
            )}
          </div>
        )}

        {showThought && (
          <ThoughtBlock
            entry={activeThought}
            variant={variant}
            nestable
            fillAvailable={isLive}
          />
        )}

        {showReasoningLoader && (
          <ReasoningLoader compact={!isLive} fillAvailable={isLive} />
        )}

        {activeAction && (
          <div className="shrink-0">
            <ActionLine entry={activeAction} variant={variant} compact highlight />
          </div>
        )}
      </div>
    </div>
  );
}
