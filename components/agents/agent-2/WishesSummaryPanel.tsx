'use client';

import type { Wish } from '@/lib/types/agent-1';

interface WishesSummaryPanelProps {
  wishes: Wish[];
}

export function WishesSummaryPanel({ wishes }: WishesSummaryPanelProps) {
  return (
    <section
      className="flex flex-col rounded-xl bg-background/40"
      aria-labelledby="wishes-summary-heading"
    >
      <div className="flex items-baseline gap-2 px-4 pt-3">
        <h3
          id="wishes-summary-heading"
          className="text-[13px] font-semibold tracking-tight text-muted"
        >
          Deseos aprobados
        </h3>
        <span className="text-[12px] tabular-nums text-subtle">{wishes.length}</span>
      </div>

      {wishes.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-subtle">No hay deseos aprobados.</p>
      ) : (
        <ol className="px-4 py-3">
          {wishes.map((wish, index) => {
            const sourceHint = wish.source === 'manual' || wish.isEdited
              ? [wish.source === 'manual' ? 'Manual' : null, wish.isEdited ? 'Editado' : null]
                  .filter(Boolean)
                  .join(' · ')
              : null;

            return (
              <li
                key={wish.id}
                className={[
                  'grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-2.5 py-2',
                  index > 0 ? 'border-t border-border/60' : '',
                ].join(' ')}
              >
                <span className="mt-px text-[12px] tabular-nums text-subtle">{index + 1}</span>
                <div className="min-w-0">
                  <p className="text-[13px] leading-relaxed text-muted">{wish.text}</p>
                  {sourceHint ? (
                    <p className="mt-0.5 text-[11px] text-subtle">{sourceHint}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
