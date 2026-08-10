'use client';

import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization, PrioritizationFramework } from '@/lib/types/agent-4';
import { CategoryBadge } from '@/components/agents/agent-4/CategorySelect';
import { FRAMEWORK_DESCRIPTIONS } from '@/lib/constants/agent-4';

interface UserStoryDetailContentProps {
  story: UserStory;
  epicTitle?: string;
  estimation?: StoryEstimation;
  prioritization?: StoryPrioritization;
  framework?: PrioritizationFramework;
}

function DetailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2.5 text-[11px] font-medium text-subtle">{label}</h3>
      {children}
    </section>
  );
}

export function UserStoryDetailContent({
  story,
  epicTitle,
  estimation,
  prioritization,
  framework,
}: UserStoryDetailContentProps) {
  const hasEstimation = estimation && estimation.points > 0;
  const hasPrioritization = prioritization?.category && framework;

  const metaParts = [
    epicTitle,
    story.source === 'auto' ? 'IA' : 'Manual',
    story.isEdited ? 'Editado' : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      {metaParts.length > 0 ? (
        <p className="text-[12px] text-subtle">{metaParts.join(' · ')}</p>
      ) : null}

      <DetailSection label="Descripción">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {story.description}
        </p>
      </DetailSection>

      <DetailSection label="Criterios de aceptación">
        {story.acceptanceCriteria.length > 0 ? (
          <ol>
            {story.acceptanceCriteria.map((criterion, idx) => (
              <li
                key={`${story.id}-ac-${idx}`}
                className={[
                  'flex gap-2.5 py-2.5',
                  idx > 0 ? 'border-t border-border' : '',
                ].join(' ')}
              >
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-subtle">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <p className="text-sm leading-relaxed text-foreground">{criterion}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-4 text-center text-sm text-muted">
            Esta historia no tiene criterios de aceptación definidos.
          </p>
        )}
      </DetailSection>

      {hasEstimation ? (
        <DetailSection label="Estimación">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[15px] font-medium tabular-nums text-foreground">
              {estimation.points} SP
            </span>
            {estimation.isModified ? (
              <span className="text-[12px] text-subtle">· Ajustado manualmente</span>
            ) : null}
          </div>
          {estimation.justification ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {estimation.justification}
            </p>
          ) : null}
        </DetailSection>
      ) : null}

      {hasPrioritization && framework ? (
        <DetailSection label={`Priorización · ${FRAMEWORK_DESCRIPTIONS[framework].label}`}>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge framework={framework} category={prioritization.category} />
            {prioritization.isModified ? (
              <span className="text-[12px] text-subtle">· Ajustado</span>
            ) : null}
          </div>
          {prioritization.justification ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {prioritization.justification}
            </p>
          ) : null}
        </DetailSection>
      ) : null}

      {story.sourceWishIds.length > 0 ? (
        <DetailSection label="Trazabilidad">
          <p className="font-mono text-[12px] text-subtle">
            {story.sourceWishIds.join(' · ')}
          </p>
        </DetailSection>
      ) : null}
    </div>
  );
}
