/**
 * @fileoverview Modal para crear o editar un deseo en el Agente 1.
 * Shell: DetailModal (mismo patrón que UserStoryFormModal / EpicFormModal).
 */

'use client';

import { useEffect, useState } from 'react';
import type { Wish } from '@/lib/types/agent-1';
import { DetailModal } from '@/components/agents/shared/DetailModal';

export interface WishFormValues {
  text: string;
}

interface WishFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: WishFormValues) => void;
  wish?: Wish | null;
}

const fieldLabelClass = 'text-[12px] font-medium text-muted';
const fieldControlClass =
  'mt-1.5 w-full rounded-lg border border-border/80 bg-input px-3 py-2.5 text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong';

export function WishFormModal({
  open,
  onClose,
  onSubmit,
  wish = null,
}: WishFormModalProps) {
  const isEdit = Boolean(wish);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!open) return;
    setText(wish?.text ?? '');
  }, [open, wish]);

  const isSaveDisabled = !text.trim();

  const handleSubmit = () => {
    if (isSaveDisabled) return;
    onSubmit({ text: text.trim() });
  };

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      eyebrow="Deseos del cliente"
      title={isEdit ? 'Editar deseo' : 'Nuevo deseo'}
      maxWidth="lg"
      compact
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSaveDisabled}
            onClick={handleSubmit}
            className={[
              'cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-opacity',
              isSaveDisabled
                ? 'cursor-not-allowed bg-disabled text-disabled-text opacity-40'
                : 'bg-foreground text-background hover:opacity-90',
            ].join(' ')}
          >
            {isEdit ? 'Guardar' : 'Añadir deseo'}
          </button>
        </div>
      }
    >
      <label className={fieldLabelClass}>
        Deseo
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          placeholder="Describe el deseo o necesidad del cliente…"
          className={`${fieldControlClass} resize-none text-[15px] font-medium leading-relaxed`}
        />
      </label>
    </DetailModal>
  );
}
