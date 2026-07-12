/**
 * @fileoverview Agent5InputPreview — Vista de solo lectura del input del Agente 5.
 *
 * Muestra el contrato de datos (`Agent5Input`) que el Agente 4 escribe en
 * `workspace.pipeline.agent5Input` al aprobar la priorización.
 */

'use client';

import type { Agent5Input } from '@/lib/types/workspace';
import { getFrameworkLabels, FRAMEWORK_DESCRIPTIONS } from '@/lib/constants/agent-4';

interface Agent5InputPreviewProps {
  input: Agent5Input;
}

export function Agent5InputPreview({ input }: Agent5InputPreviewProps) {
  const epicCount = input.epics.length;
  const storyCount = input.epics.reduce((sum, epic) => sum + epic.userStories.length, 0);
  const totalPoints = input.epics
    .flatMap((e) => e.userStories)
    .reduce((sum, story) => sum + (input.estimations[story.id]?.points ?? 0), 0);
  const priorityCount = Object.keys(input.priorities).length;
  const approvedDate = new Date(input.approvedAt).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const frameworkLabel = FRAMEWORK_DESCRIPTIONS[input.framework].label;

  const categoryCounts = Object.values(input.priorities).reduce(
    (acc, pri) => {
      acc[pri.category] = (acc[pri.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-surface-muted px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Épicas</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{epicCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Historias</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{storyCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Story Points</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalPoints}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Priorizadas</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{priorityCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Framework</p>
          <p className="mt-1 text-lg font-bold text-foreground">{frameworkLabel}</p>
        </div>
      </div>

      {priorityCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary/80"
            >
              {getFrameworkLabels(input.framework)[cat] ?? cat}
              <span className="rounded-full bg-black/10 px-1 py-0 text-[9px]">{count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-bold text-foreground">Datos de entrada — Agent5Input</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Consolidado el {approvedDate} por el Agente 4
          </p>
        </div>

        <div className="px-6 py-4">
          <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">epics</dt>
              <dd className="text-muted">
                Backlog completo con épicas e historias (tipo{' '}
                <code className="font-mono text-xs">Epic[]</code>)
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">estimations</dt>
              <dd className="text-muted">
                Story Points por historia (
                <code className="font-mono text-xs">Record&lt;storyId, StoryEstimation&gt;</code>)
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">priorities</dt>
              <dd className="text-muted">
                Categoría MoSCoW (u otro framework) por historia (
                <code className="font-mono text-xs">Record&lt;storyId, StoryPrioritization&gt;</code>)
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">framework</dt>
              <dd className="text-muted">
                Framework de priorización usado (
                <code className="font-mono text-xs">PrioritizationFramework</code>)
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">sourceWishIds</dt>
              <dd className="text-muted">IDs de deseos del Agente 1 que originaron el backlog</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">approvedAt</dt>
              <dd className="text-muted">
                Marca de tiempo Unix (ms) de la aprobación en el Agente 4
              </dd>
            </div>
          </dl>

          <pre
            className={[
              'max-h-112 overflow-auto rounded-xl border border-border bg-surface-muted',
              'p-4 text-left text-xs leading-relaxed text-foreground',
              'font-mono whitespace-pre-wrap wrap-break-word',
            ].join(' ')}
            aria-label="JSON de entrada del Agente 5"
          >
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
