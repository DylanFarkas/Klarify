/**
 * @fileoverview Agent3InputPreview — Vista de solo lectura del input del Agente 3.
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
      <p className="text-[13px] text-subtle">
        {epicCount} épicas · {storyCount} historias · {input.sourceWishIds.length} deseos origen
      </p>

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3.5 md:px-5">
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
            Datos de entrada — Agent3Input
          </h3>
          <p className="mt-1 text-[12px] text-muted">
            Aprobado el {approvedDate} por el Agente 2
          </p>
        </div>

        <div className="px-4 py-4 md:px-5">
          <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">epics</dt>
              <dd className="text-muted">
                Épicas con historias de usuario aprobadas (tipo{' '}
                <code className="font-mono text-xs">Epic[]</code>)
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">sourceWishIds</dt>
              <dd className="text-muted">
                IDs de deseos del Agente 1 que originaron el backlog
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">approvedAt</dt>
              <dd className="text-muted">
                Marca de tiempo Unix (ms) de la aprobación en el Agente 2
              </dd>
            </div>
          </dl>

          <pre
            className="max-h-112 overflow-auto rounded-lg border border-border bg-background p-4 text-left font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground"
            aria-label="JSON de entrada del Agente 3"
          >
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
