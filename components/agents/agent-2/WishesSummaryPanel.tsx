'use client';

import type { Wish } from '@/lib/types/agent-1';

interface WishesSummaryPanelProps {
  wishes: Wish[];
}

export function WishesSummaryPanel({ wishes }: WishesSummaryPanelProps) {
  return (
    <section
      className="flex flex-col rounded-2xl border border-border bg-surface-muted/80 backdrop-blur-sm animate-[fadeIn_0.5s_ease-out] lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]"
      aria-labelledby="wishes-summary-heading"
    >
      {/* ── Header con ícono ─────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <h3 id="wishes-summary-heading" className="text-lg font-bold text-foreground">
            Deseos Aprobados
          </h3>
          <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
            {wishes.length}
          </span>
        </div>
      </div>

      {/* ── Lista de deseos ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[300px] lg:max-h-none">
        {wishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hover">
              <svg className="h-6 w-6 text-icon-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-subtle">
              No hay deseos aprobados.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {wishes.map((wish, index) => (
              <div
                key={wish.id}
                className="rounded-lg border border-border bg-surface p-3.5 transition-all duration-200 hover:border-border-strong hover:bg-surface-hover"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-bold font-mono text-muted">
                    {wish.id}
                  </span>
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                      wish.source === 'auto'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-purple-500/20 text-purple-400',
                    ].join(' ')}
                  >
                    {wish.source === 'auto' ? 'IA' : 'Manual'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-body">
                  {wish.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer informativo ───────────────────────────────── */}
      <div className="border-t border-border px-6 py-3">
        <p className="text-xs text-subtle">
          Referencia para la trazabilidad de historias de usuario.
        </p>
      </div>
    </section>
  );
}