/**
 * @fileoverview WishesSummaryPanel — Panel lateral de deseos aprobados (solo lectura).
 *
 * Muestra los deseos del Agente 1 como referencia durante la revisión
 * del backlog del Agente 2. No permite edición.
 *
 * En desktop: sticky en la columna izquierda.
 * En mobile: se apila arriba del backlog.
 *
 * Cumple: referencia de trazabilidad (sourceWishIds en HUs).
 */

'use client';

import type { Wish } from '@/lib/types/agent-1';

interface WishesSummaryPanelProps {
  /** Lista de deseos aprobados del Agente 1 */
  wishes: Wish[];
}

export function WishesSummaryPanel({ wishes }: WishesSummaryPanelProps) {
  return (
    <section
      className="flex flex-col rounded-2xl border border-border bg-surface-muted backdrop-blur-sm animate-[fadeIn_0.5s_ease-out] lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]"
      aria-labelledby="wishes-summary-heading"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h3 id="wishes-summary-heading" className="text-lg font-bold text-foreground">
            Deseos Aprobados
          </h3>
          <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
            {wishes.length}
          </span>
        </div>
      </div>

      {/* ── Lista ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[300px] lg:max-h-none">
        {wishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-subtle">
              No hay deseos aprobados.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {wishes.map((wish, index) => (
              <div
                key={wish.id}
                className={[
                  'rounded-lg border border-border bg-surface p-3',
                  'transition-all duration-200',
                ].join(' ')}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-muted">
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
    </section>
  );
}
