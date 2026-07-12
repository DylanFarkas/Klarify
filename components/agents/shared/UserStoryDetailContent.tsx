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
  delay = 0,
}: {
  label: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="detail-section-in border-b border-border/50 pb-5 last:border-b-0 last:pb-0"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
        {label}
      </h3>
      {children}
    </section>
  );
}

function SourceBadge({ source }: { source: UserStory['source'] }) {
  return (
    <span
      className={[
        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
        source === 'auto' ? 'bg-primary/15 text-primary' : 'bg-purple-500/15 text-purple-400',
      ].join(' ')}
    >
      {source === 'auto' ? 'Generada por IA' : 'Manual'}
    </span>
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

  return (
    <div className="flex flex-col gap-5">
      {(epicTitle || story.isEdited) && (
        <div className="detail-section-in flex flex-wrap items-center gap-2" style={{ animationDelay: '0ms' }}>
          {epicTitle && (
            <span className="rounded-lg border border-border/60 bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-muted">
              {epicTitle}
            </span>
          )}
          <SourceBadge source={story.source} />
          {story.isEdited && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-500">
              Editado
            </span>
          )}
        </div>
      )}

      <DetailSection label="Descripción" delay={40}>
        <p className="text-sm leading-relaxed text-body whitespace-pre-wrap">{story.description}</p>
      </DetailSection>

      <DetailSection label="Criterios de aceptación" delay={80}>
        {story.acceptanceCriteria.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {story.acceptanceCriteria.map((criterion, idx) => (
              <li
                key={`${story.id}-ac-${idx}`}
                className="detail-section-in flex gap-3 rounded-xl border border-border/50 bg-surface-muted/50 px-3.5 py-3"
                style={{ animationDelay: `${120 + idx * 40}ms` }}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                  {idx + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground">{criterion}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
            Esta historia no tiene criterios de aceptación definidos.
          </p>
        )}
      </DetailSection>

      {hasEstimation && (
        <DetailSection label="Estimación" delay={160}>
          <div className="rounded-xl border border-border/60 bg-surface-muted/40 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <span className="text-base font-bold leading-none text-primary">{estimation.points}</span>
                <span className="mt-0.5 text-[8px] font-medium uppercase text-primary/70">SP</span>
              </div>
              {estimation.isModified && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
                  Ajustado manualmente
                </span>
              )}
            </div>
            {estimation.justification && (
              <blockquote className="border-l-2 border-primary/30 pl-3 text-sm italic leading-relaxed text-muted">
                &ldquo;{estimation.justification}&rdquo;
              </blockquote>
            )}
          </div>
        </DetailSection>
      )}

      {hasPrioritization && framework && (
        <DetailSection label={`Priorización · ${FRAMEWORK_DESCRIPTIONS[framework].label}`} delay={200}>
          <div className="rounded-xl border border-border/60 bg-surface-muted/40 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <CategoryBadge framework={framework} category={prioritization.category} />
              {prioritization.isModified && (
                <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600">
                  HITL
                </span>
              )}
            </div>
            {prioritization.justification && (
              <blockquote className="border-l-2 border-primary/30 pl-3 text-sm italic leading-relaxed text-muted">
                &ldquo;{prioritization.justification}&rdquo;
              </blockquote>
            )}
          </div>
        </DetailSection>
      )}

      {story.sourceWishIds.length > 0 && (
        <DetailSection label="Trazabilidad" delay={240}>
          <div className="flex flex-wrap gap-1.5">
            {story.sourceWishIds.map((wishId) => (
              <span
                key={wishId}
                className="rounded-md border border-border bg-surface-muted px-2 py-0.5 font-mono text-[10px] text-muted"
              >
                {wishId}
              </span>
            ))}
          </div>
        </DetailSection>
      )}
    </div>
  );
}
