'use client';

interface ReasoningLoaderProps {
  compact?: boolean;
  fillAvailable?: boolean;
}

export function ReasoningLoader({ compact = false, fillAvailable = false }: ReasoningLoaderProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-border/50 bg-surface/50',
        fillAvailable ? 'min-h-0 flex-1 py-12' : compact ? 'py-8' : 'py-16',
      ].join(' ')}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="text-sm text-muted">Esperando respuesta del modelo…</p>
    </div>
  );
}
