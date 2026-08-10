'use client';

import type { Wish } from '@/lib/types/agent-1';

interface WishesSummaryPanelProps {
  wishes: Wish[];
}

export function WishesSummaryPanel({ wishes }: WishesSummaryPanelProps) {
  return (
    <section
      className="flex flex-col rounded-xl border border-border bg-surface"
      aria-labelledby="wishes-summary-heading"
    >
      <div className="border-b border-border px-4 py-3.5 md:px-5">
        <div className="flex items-center gap-2.5">
          <h3
            id="wishes-summary-heading"
            className="text-[15px] font-semibold tracking-tight text-foreground"
          >
            Deseos aprobados
          </h3>
          <span className="text-[12px] tabular-nums text-subtle">{wishes.length}</span>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          Referencia para la trazabilidad de las historias.
        </p>
      </div>

      <div className="max-h-80 flex-1 overflow-y-auto md:max-h-none lg:max-h-[min(520px,60vh)]">
        {wishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted">No hay deseos aprobados.</p>
          </div>
        ) : (
          <ul>
            {wishes.map((wish, index) => (
              <li
                key={wish.id}
                className={[
                  'px-4 py-3.5 md:px-5',
                  index > 0 ? 'border-t border-border' : '',
                ].join(' ')}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] font-medium tabular-nums text-subtle">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[11px] text-subtle">{wish.id}</span>
                  <span className="text-[11px] text-subtle">
                    · {wish.source === 'auto' ? 'IA' : 'Manual'}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-foreground">{wish.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
