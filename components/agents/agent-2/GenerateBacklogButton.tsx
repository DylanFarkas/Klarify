/**
 * @fileoverview GenerateBacklogButton — Botón para disparar la generación de backlog.
 *
 * Patrón alineado con ApproveButton (CTA foreground/background, sin glow).
 */

'use client';

interface GenerateBacklogButtonProps {
  /** Callback cuando el usuario hace clic */
  onClick: () => void;
  /** Estado de carga (generando backlog) */
  isGenerating: boolean;
}

export function GenerateBacklogButton({ onClick, isGenerating }: GenerateBacklogButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isGenerating}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
        'transition-opacity cursor-pointer',
        isGenerating
          ? 'cursor-not-allowed bg-disabled text-disabled-text'
          : 'bg-foreground text-background hover:opacity-90',
      ].join(' ')}
      aria-label={isGenerating ? 'Generando backlog...' : 'Generar Backlog'}
    >
      {isGenerating ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Generando…
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
            />
          </svg>
          Generar Backlog
        </>
      )}
    </button>
  );
}
