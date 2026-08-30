/**
 * @fileoverview Modal para crear o editar una épica en el Agente 2.
 * Shell: DetailModal (mismo patrón que UserStoryFormModal).
 */

'use client';

import { useEffect, useState } from 'react';
import type { Epic } from '@/lib/types/agent-2';
import { DetailModal } from '@/components/agents/shared/DetailModal';

export interface EpicFormValues {
  title: string;
  description: string;
}

interface EpicFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: EpicFormValues) => void;
  epic?: Epic | null;
}

const fieldLabelClass = 'text-[12px] font-medium text-muted';
const fieldControlClass =
  'mt-1.5 w-full rounded-lg border border-border/80 bg-input px-3 py-2.5 text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong';

export function EpicFormModal({
  open,
  onClose,
  onSubmit,
  epic = null,
}: EpicFormModalProps) {
  const isEdit = Boolean(epic);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(epic?.title ?? '');
    setDescription(epic?.description ?? '');
  }, [open, epic]);

  const isSaveDisabled = !title.trim();

  const handleSubmit = () => {
    if (isSaveDisabled) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
    });
  };

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      eyebrow="Backlog"
      subtitle={isEdit ? epic?.id : undefined}
      title={isEdit ? 'Editar épica' : 'Nueva épica'}
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
            {isEdit ? 'Guardar' : 'Añadir épica'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <label className={fieldLabelClass}>
          Título
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título de la épica…"
            className={`${fieldControlClass} text-[15px] font-medium`}
          />
        </label>

        <label className={fieldLabelClass}>
          Descripción
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Qué cubre esta épica…"
            className={`${fieldControlClass} resize-none text-sm leading-relaxed`}
          />
        </label>
      </div>
    </DetailModal>
  );
}
