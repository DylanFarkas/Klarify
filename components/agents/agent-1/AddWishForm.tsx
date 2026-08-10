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
    <form onSubmit={handleSubmit} className="px-4 py-3.5 md:px-5">
      <label htmlFor="new-wish-input" className="mb-1.5 block text-[12px] font-medium text-muted">
        Nuevo deseo
      </label>

      <textarea
        id="new-wish-input"
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        placeholder="Describe el deseo o necesidad del cliente…"
        className="w-full resize-none rounded-lg border border-input-border bg-input px-3 py-2.5 text-[15px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
      />

      <div className="mt-2.5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!text.trim()}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Añadir
        </button>
      </div>
    </form>
  );
}
