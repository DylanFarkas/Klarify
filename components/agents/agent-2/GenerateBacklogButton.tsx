/**
 * @fileoverview GenerateBacklogButton — Botón para disparar la generación de backlog.
 *
 * Patrón replicado de ApproveButton.tsx (shared), adaptado para mostrar
 * estado de carga con spinner.
 *
 * Usado en EmptyBacklogState y en la barra de acciones del Agente 2.
 */

'use client';

import { useState } from 'react';

interface GenerateBacklogButtonProps {
  /** Callback cuando el usuario hace clic */
  onClick: () => void;
  /** Estado de carga (generando backlog) */
  isGenerating: boolean;
}

export function GenerateBacklogButton({ onClick, isGenerating }: GenerateBacklogButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (isGenerating || isAnimating) return;
    setIsAnimating(true);
    onClick();
    setTimeout(() => setIsAnimating(false), 800);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isGenerating}
      className={[
        'inline-flex items-center gap-3 rounded-xl px-8 py-4 text-base font-bold',
        'transition-all duration-300 cursor-pointer',
        isGenerating
          ? 'cursor-not-allowed bg-disabled text-disabled-text'
          : [
              'bg-primary text-white',
              'shadow-[0_0_30px_color-mix(in_srgb,var(--primary)_30%,transparent)]',
              'hover:shadow-[0_0_40px_color-mix(in_srgb,var(--primary)_50%,transparent)]',
              'hover:scale-[1.03] active:scale-95',
            ].join(' '),
        isAnimating && 'scale-105 shadow-[0_0_50px_color-mix(in_srgb,var(--primary)_60%,transparent)]',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={isGenerating ? 'Generando backlog...' : 'Generar Backlog'}
    >
      {isGenerating ? (
        <>
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Generando...
        </>
      ) : (
        <>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Generar Backlog
        </>
      )}
    </button>
  );
}
