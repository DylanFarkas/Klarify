'use client';

import type { RegenerationAgent } from '@/lib/plans/types';
import { getUpgradeTargetForRegeneration } from '@/lib/plans/regeneration-policy';
import { useWorkspace } from '@/hooks/useWorkspace';

interface RegenerationHintProps {
  agent: RegenerationAgent;
  className?: string;
}

export function RegenerationHint({ agent, className = '' }: RegenerationHintProps) {
  const { plan, canRegenerate } = useWorkspace();

  if (!plan || canRegenerate(agent)) {
    return null;
  }

  const upgrade = getUpgradeTargetForRegeneration(plan.id);
  const upgradeLabel = upgrade === 'starter' ? 'Starter' : upgrade === 'pro' ? 'Pro' : null;

  return (
    <p className={`text-xs text-muted ${className}`}>
      La regeneración con IA no está incluida en tu plan.
      {upgradeLabel ? (
        <>
          {' '}
          Disponible en{' '}
          <a href="/#pricing" className="font-medium text-primary underline-offset-2 hover:underline">
            {upgradeLabel}
          </a>
          .
        </>
      ) : null}{' '}
      Puedes seguir editando manualmente.
    </p>
  );
}
