/**
 * @fileoverview AddWishForm — Formulario para añadir un deseo manualmente.
 *
 * Se muestra inline dentro de la lista de deseos cuando el usuario
 * hace clic en "Añadir deseo". Permite escribir texto libre.
 *
 * Cumple CA3 (HITL): Añadir deseos manualmente.
 */

'use client';

import { useState, useRef, useEffect } from 'react';

interface AddWishFormProps {
  /** Callback cuando el usuario confirma el nuevo deseo */
  onAdd: (text: string) => void;
  /** Callback para cerrar el formulario sin añadir */
  onCancel: () => void;
}

export function AddWishForm({ onAdd, onCancel }: AddWishFormProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autofocar al montar
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={[
        'rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4',
        'animate-[fadeIn_0.2s_ease-out]',
      ].join(' ')}
    >
      <label htmlFor="new-wish-input" className="mb-2 block text-xs font-bold text-muted">
        Nuevo deseo del cliente
      </label>

      <textarea
        id="new-wish-input"
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        placeholder="Describe el deseo o necesidad del cliente..."
        className={[
          'w-full resize-none rounded-lg border border-input-border bg-surface px-3 py-2',
          'text-sm text-foreground placeholder:text-placeholder',
          'outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30',
          'transition-all duration-200',
        ].join(' ')}
      />

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!text.trim()}
          className={[
            'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer',
            text.trim()
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'bg-disabled text-disabled-text cursor-not-allowed',
          ].join(' ')}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Añadir
        </button>
      </div>
    </form>
  );
}
