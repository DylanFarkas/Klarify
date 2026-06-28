'use client';

import type { ActivityPhaseGroup } from '@/lib/utils/agent-activity-groups';
import { PhaseDivider } from './PhaseDivider';
import { PhaseTimeline } from './PhaseTimeline';

interface PhaseSectionProps {
  group: ActivityPhaseGroup;
  variant?: 'default' | 'live';
}

export function PhaseSection({ group, variant = 'default' }: PhaseSectionProps) {
  const isLive = variant === 'live';

  return (
    <div className={isLive ? 'flex min-h-0 flex-1 flex-col gap-2' : 'flex flex-col gap-2'}>
      {!isLive && <PhaseDivider entry={group.phase} variant={variant} />}
      <PhaseTimeline group={group} variant={variant} />
    </div>
  );
}
