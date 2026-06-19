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
    // Resetear animación después de completar
    setTimeout(() => setIsAnimating(false), 800);
  };

  return (
    <button
      id="approve-button"
      onClick={handleClick}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-3 rounded-xl px-8 py-4 text-base font-bold',
        'transition-all duration-300 cursor-pointer',
        disabled
          ? 'cursor-not-allowed bg-white/10 text-white/30'
          : [
              'bg-[#005BBF] text-white',
              'shadow-[0_0_30px_rgba(0,91,191,0.3)]',
              'hover:shadow-[0_0_40px_rgba(0,91,191,0.5)]',
              'hover:scale-[1.03] active:scale-95',
            ].join(' '),
        isAnimating && 'scale-105 shadow-[0_0_50px_rgba(0,91,191,0.6)]',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
    >
      {/* Icono check */}
      <svg
        className="h-5 w-5"
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
