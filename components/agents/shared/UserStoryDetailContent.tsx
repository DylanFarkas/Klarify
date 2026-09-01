'use client';

import type { UserStory } from '@/lib/types/agent-2';
import type { EstimationMode, StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization, PrioritizationFramework } from '@/lib/types/agent-4';
import { CategoryBadge } from '@/components/agents/agent-4/CategorySelect';
import {
  WorkItemTypeBadge,
  bugSeverityLabel,
  workItemTypeLabel,
} from '@/components/agents/shared/WorkItemTypeBadge';
import { FRAMEWORK_DESCRIPTIONS } from '@/lib/constants/agent-4';
import { resolveWorkItemType } from '@/lib/utils/work-item-validation';
import { formatEstimation, isStoryEstimated } from '@/lib/utils/estimation';

interface UserStoryDetailContentProps {
  story: UserStory;
  epicTitle?: string;
  estimation?: StoryEstimation;
  estimationMode?: EstimationMode;
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
    <section className="border-t border-border/50 pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2.5 text-[11px] font-medium text-subtle">{label}</h3>
      {children}
    </section>
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-2.5 border-b border-border/40 last:border-b-0">
      <span className="text-[11px] font-medium text-subtle">{label}</span>
      <div className="min-w-0 text-sm text-foreground">{children}</div>
    </div>
  );
}

export function UserStoryDetailContent({
  story,
  epicTitle,
  estimation,
  estimationMode = 'story_points',
  prioritization,
  framework,
}: UserStoryDetailContentProps) {
  const type = resolveWorkItemType(story);
  const hasEstimation = isStoryEstimated(estimation, estimationMode);
  const hasPrioritization = prioritization?.category && framework;
  const steps = story.stepsToReproduce ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0 flex flex-col gap-4">
        <DetailSection label="Descripción">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {story.description}
          </p>
        </DetailSection>

        {type === 'bug' ? (
          <DetailSection label="Pasos para reproducir">
            {steps.length > 0 ? (
              <ol>
                {steps.map((step, idx) => (
                  <li
                    key={`${story.id}-step-${idx}`}
                    className={[
                      'flex gap-2.5 py-2.5',
                      idx > 0 ? 'border-t border-border/50' : '',
                    ].join(' ')}
                  >
                    <span className="shrink-0 text-[11px] font-medium tabular-nums text-subtle">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="text-sm leading-relaxed text-foreground">{step}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-4 text-center text-sm text-muted">
                Sin pasos de reproducción definidos.
              </p>
            )}
          </DetailSection>
        ) : null}

        {type === 'task' && story.technicalNotes ? (
          <DetailSection label="Notas técnicas">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {story.technicalNotes}
            </p>
          </DetailSection>
        ) : null}

        <DetailSection label="Criterios de aceptación">
          {story.acceptanceCriteria.length > 0 ? (
            <ol>
              {story.acceptanceCriteria.map((criterion, idx) => (
                <li
                  key={`${story.id}-ac-${idx}`}
                  className={[
                    'flex gap-2.5 py-2.5',
                    idx > 0 ? 'border-t border-border/50' : '',
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
              {type === 'story'
                ? 'Esta historia no tiene criterios de aceptación definidos.'
                : 'Sin criterios de aceptación.'}
            </p>
          )}
        </DetailSection>

        <DetailSection label="Subtareas">
          {(story.subtasks ?? []).length > 0 ? (
            <ol>
              {(story.subtasks ?? []).map((subtask, idx) => (
                <li
                  key={subtask.id}
                  className={[
                    'flex items-center gap-2.5 py-2.5',
                    idx > 0 ? 'border-t border-border/50' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border',
                      subtask.done
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {subtask.done ? (
                      <svg
                        className="size-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[11px] font-medium leading-none tabular-nums text-subtle">
                    {subtask.id}
                  </span>
                  <p
                    className={[
                      'min-w-0 flex-1 text-sm leading-relaxed text-foreground',
                      subtask.done ? 'text-muted line-through' : '',
                    ].join(' ')}
                  >
                    {subtask.title}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-4 text-center text-sm text-muted">Sin subtareas.</p>
          )}
        </DetailSection>

        {story.sourceWishIds.length > 0 ? (
          <DetailSection label="Trazabilidad">
            <p className="font-mono text-[12px] text-subtle">
              {story.sourceWishIds.join(' · ')}
            </p>
          </DetailSection>
        ) : null}
      </div>

      <aside className="min-w-0 lg:border-l lg:border-border/50 lg:pl-5">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
          Propiedades
        </p>

        <PropertyRow label="Tipo">
          <div className="flex flex-wrap items-center gap-2">
            <WorkItemTypeBadge type={type} />
            {type === 'bug' && story.severity ? (
              <span className="text-[12px] text-subtle">
                {bugSeverityLabel(story.severity)}
              </span>
            ) : null}
          </div>
        </PropertyRow>

        {epicTitle ? (
          <PropertyRow label="Épica">
            <span className="text-[13px] text-muted">{epicTitle}</span>
          </PropertyRow>
        ) : null}

        <PropertyRow label="Origen">
          <span className="text-[13px] text-muted">
            {[
              workItemTypeLabel(type),
              story.source === 'auto' ? 'IA' : 'Manual',
              story.isEdited ? 'Editado' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </PropertyRow>

        {hasEstimation && estimation ? (
          <PropertyRow label="Estimación">
            <div className="flex flex-col gap-1">
              <span className="tabular-nums text-foreground">
                {formatEstimation(estimation, estimationMode)}
                {estimation.isModified ? (
                  <span className="ml-1.5 text-[12px] text-subtle">· Ajustado</span>
                ) : null}
              </span>
              {estimation.justification ? (
                <p className="text-[12px] leading-relaxed text-subtle">
                  {estimation.justification}
                </p>
              ) : null}
            </div>
          </PropertyRow>
        ) : null}

        {hasPrioritization && framework ? (
          <PropertyRow label={`Prioridad · ${FRAMEWORK_DESCRIPTIONS[framework].label}`}>
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge framework={framework} category={prioritization.category} />
                {prioritization.isModified ? (
                  <span className="text-[12px] text-subtle">· Ajustado</span>
                ) : null}
              </div>
              {prioritization.justification ? (
                <p className="text-[12px] leading-relaxed text-subtle">
                  {prioritization.justification}
                </p>
              ) : null}
            </div>
          </PropertyRow>
        ) : null}
      </aside>
    </div>
  );
}
