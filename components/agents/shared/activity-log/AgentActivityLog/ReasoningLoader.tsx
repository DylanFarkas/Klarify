'use client';

interface ReasoningLoaderProps {
  compact?: boolean;
  fillAvailable?: boolean;
}

export function ReasoningLoader({ compact = false, fillAvailable = false }: ReasoningLoaderProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3',
        fillAvailable ? 'min-h-0 flex-1 py-10' : compact ? 'py-6' : 'py-10',
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 w-1 animate-pulse rounded-full bg-foreground/50"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
      <p className="text-[13px] text-muted">Esperando respuesta del modelo…</p>
    </div>
  );
}
