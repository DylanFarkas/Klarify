/**
 * @fileoverview Modal para crear o editar una historia de usuario en el Agente 2.
 * Shell: DetailModal (mismo patrón que DashboardStoryFormModal).
 */

'use client';

import { useEffect, useState } from 'react';
import type { UserStory } from '@/lib/types/agent-2';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { AcceptanceCriteriaEditor } from './AcceptanceCriteriaEditor';

export interface UserStoryFormValues {
  title: string;
  description: string;
  acceptanceCriteria: string[];
}

interface UserStoryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: UserStoryFormValues) => void;
  story?: UserStory | null;
  epicTitle?: string;
}

const fieldLabelClass = 'text-[12px] font-medium text-muted';
const fieldControlClass =
  'mt-1.5 w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong';

export function UserStoryFormModal({
  open,
  onClose,
  onSubmit,
  story = null,
  epicTitle,
}: UserStoryFormModalProps) {
  const isEdit = Boolean(story);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(story?.title ?? '');
    setDescription(story?.description ?? '');
    setCriteria(story?.acceptanceCriteria ?? []);
  }, [open, story]);

  const isSaveDisabled = !title.trim() || !description.trim();

  const handleSubmit = () => {
    if (isSaveDisabled) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      acceptanceCriteria: criteria,
    });
  };

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      eyebrow={epicTitle ?? 'Backlog'}
      subtitle={isEdit ? story?.id : undefined}
      title={isEdit ? 'Editar historia' : 'Nueva historia'}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4">
        <label className={fieldLabelClass}>
          Título
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título de la historia…"
            className={`${fieldControlClass} font-medium`}
          />
        </label>

        <label className={fieldLabelClass}>
          Descripción
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Como [rol], quiero [acción] para [beneficio]…"
            className={`${fieldControlClass} resize-none`}
          />
        </label>

        <div>
          <p className={`${fieldLabelClass} mb-1.5`}>Criterios de aceptación</p>
          <AcceptanceCriteriaEditor
            criteria={criteria}
            onChange={setCriteria}
            disabled={false}
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg bg-surface-muted px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
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
          {isEdit ? 'Guardar' : 'Añadir historia'}
        </button>
      </div>
    </DetailModal>
  );
}
