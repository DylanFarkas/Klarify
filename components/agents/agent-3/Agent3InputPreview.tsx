/**
 * @fileoverview Agent3InputPreview — Vista de solo lectura del input del Agente 3.
 *
 * Muestra el contrato de datos (`Agent3Input`) que el Agente 2 escribe en
 * `workspace.pipeline.agent3Input` al aprobar el backlog. Referencia para
 * quien implemente la lógica de estimación.
 */

'use client';

import type { Agent3Input } from '@/lib/types/workspace';

interface Agent3InputPreviewProps {
  input: Agent3Input;
}

export function Agent3InputPreview({ input }: Agent3InputPreviewProps) {
  const epicCount = input.epics.length;
  const storyCount = input.epics.reduce((sum, epic) => sum + epic.userStories.length, 0);
  const approvedDate = new Date(input.approvedAt).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Resumen del input */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-muted px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Épicas</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{epicCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Historias de usuario</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{storyCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Deseos origen</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{input.sourceWishIds.length}</p>
        </div>
      </div>

      {/* Contrato de datos */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-bold text-foreground">Datos de entrada — Agent3Input</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Aprobado el {approvedDate} por el Agente 2
          </p>
        </div>

        <div className="px-6 py-4">
          <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">epics</dt>
              <dd className="text-muted">Épicas con historias de usuario aprobadas (tipo <code className="font-mono text-xs">Epic[]</code>)</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">sourceWishIds</dt>
              <dd className="text-muted">IDs de deseos del Agente 1 que originaron el backlog</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">approvedAt</dt>
              <dd className="text-muted">Marca de tiempo Unix (ms) de la aprobación en el Agente 2</dd>
            </div>
          </dl>

          <pre
            className={[
              'max-h-112 overflow-auto rounded-xl border border-border bg-surface-muted',
              'p-4 text-left text-xs leading-relaxed text-foreground',
              'font-mono whitespace-pre-wrap wrap-break-word',
            ].join(' ')}
            aria-label="JSON de entrada del Agente 3"
          >
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
