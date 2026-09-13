/**
 * @fileoverview ApproveButton — Botón de aprobación reutilizable.
 *
 * Usado al final de cada agente para confirmar los resultados
 * y avanzar al siguiente paso del pipeline.
 *
 * Requiere 'use client' por el estado de animación al hacer clic.
 */

'use client';

import { useState } from 'react';

interface ApproveButtonProps {
  /** Callback cuando el usuario aprueba */
  onClick: () => void;
  /** Deshabilita el botón (ej: cuando no hay deseos) */
  disabled: boolean;
  /** Texto del botón (ej: "Aprobar Deseos y Continuar") */
  label: string;
}

export function ApproveButton({ onClick, disabled, label }: ApproveButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (disabled || isAnimating) return;
    setIsAnimating(true);
    onClick();
    setTimeout(() => setIsAnimating(false), 800);
  };

  return (
    <button
      id="approve-button"
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={[
        'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium sm:w-auto',
        'transition-opacity cursor-pointer',
        disabled
          ? 'cursor-not-allowed bg-disabled text-disabled-text'
          : 'bg-foreground text-background hover:opacity-90',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {label}
    </button>
  );
}
