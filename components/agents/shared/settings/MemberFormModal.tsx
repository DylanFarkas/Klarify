'use client';

import { useEffect, useId, useState } from 'react';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import type { ProjectMember, ProjectMemberRole } from '@/lib/types/execution';
import { MEMBER_ROLE_LABELS } from '@/lib/types/execution';

interface MemberFormModalProps {
  open: boolean;
  member?: ProjectMember | null;
  onClose: () => void;
  onSubmit: (data: { displayName: string; email?: string; role: ProjectMemberRole }) => void;
}

const ROLE_CHIP_LABELS: Record<ProjectMemberRole, string> = {
  scrum_master: 'SM',
  product_owner: 'PO',
  developer: 'Dev',
  qa: 'QA',
  designer: 'Design',
};

const fieldLabelClass = 'text-[12px] font-medium text-muted';
const fieldControlClass =
  'mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-border-strong';

export function MemberFormModal({ open, member = null, onClose, onSubmit }: MemberFormModalProps) {
  const formId = useId();
  const isEdit = Boolean(member);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectMemberRole>('developer');

  useEffect(() => {
    if (!open) return;
    setDisplayName(member?.displayName ?? '');
    setEmail(member?.email ?? '');
    setRole(member?.role ?? 'developer');
  }, [open, member]);

  const canSubmit = Boolean(displayName.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      displayName: displayName.trim(),
      email: email.trim() || undefined,
      role,
    });
  };

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      eyebrow="Equipo"
      title={isEdit ? 'Editar persona' : 'Nueva persona'}
      maxWidth="md"
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
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={[
              'cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-opacity',
              canSubmit
                ? 'bg-foreground text-background hover:opacity-90'
                : 'cursor-not-allowed bg-disabled text-disabled-text opacity-40',
            ].join(' ')}
          >
            {isEdit ? 'Guardar' : 'Añadir persona'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor={`${formId}-name`} className={fieldLabelClass}>
            Nombre
          </label>
          <input
            id={`${formId}-name`}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ana García"
            autoComplete="off"
            className={fieldControlClass}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-email`} className={fieldLabelClass}>
            Email
          </label>
          <input
            id={`${formId}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ana@equipo.com"
            autoComplete="off"
            className={fieldControlClass}
          />
          <p className="mt-1.5 text-[12px] text-subtle">
            Lo usaremos para invitarla al proyecto cuando las invitaciones estén listas.
          </p>
        </div>
        <div>
          <p className={fieldLabelClass} id={`${formId}-role`}>
            Rol
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1" role="radiogroup" aria-labelledby={`${formId}-role`}>
            {(Object.keys(MEMBER_ROLE_LABELS) as ProjectMemberRole[]).map((option) => {
              const selected = role === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={MEMBER_ROLE_LABELS[option]}
                  title={MEMBER_ROLE_LABELS[option]}
                  onClick={() => setRole(option)}
                  className={[
                    'cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
                    selected
                      ? 'bg-foreground text-background'
                      : 'text-muted hover:bg-surface-hover hover:text-foreground',
                  ].join(' ')}
                >
                  {ROLE_CHIP_LABELS[option]}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[12px] text-subtle">{MEMBER_ROLE_LABELS[role]}</p>
        </div>
      </div>
    </DetailModal>
  );
}
