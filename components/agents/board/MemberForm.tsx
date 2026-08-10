'use client';

import { useState } from 'react';
import type { ProjectMember, ProjectMemberRole } from '@/lib/types/execution';
import { MEMBER_ROLE_LABELS } from '@/lib/types/execution';

interface MemberFormProps {
  initial?: ProjectMember | null;
  compact?: boolean;
  onSubmit: (data: { displayName: string; email?: string; role: ProjectMemberRole }) => void;
  onCancel: () => void;
}

export function MemberForm({ initial, compact = false, onSubmit, onCancel }: MemberFormProps) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [role, setRole] = useState<ProjectMemberRole>(initial?.role ?? 'developer');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    onSubmit({
      displayName: displayName.trim(),
      email: email.trim() || undefined,
      role,
    });
  };

  const inputClass =
    'mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-border-strong focus:outline-none';

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-3 rounded-lg border border-border bg-surface-muted/25 ${compact ? 'p-3' : 'p-4'}`}
    >
      <div>
        <label htmlFor="member-name" className="text-[11px] font-medium text-subtle">
          Nombre
        </label>
        <input
          id="member-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label htmlFor="member-email" className="text-[11px] font-medium text-subtle">
          Email (opcional)
        </label>
        <input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="member-role" className="text-[11px] font-medium text-subtle">
          Rol
        </label>
        <select
          id="member-role"
          value={role}
          onChange={(e) => setRole(e.target.value as ProjectMemberRole)}
          className={inputClass}
        >
          {(Object.keys(MEMBER_ROLE_LABELS) as ProjectMemberRole[]).map((r) => (
            <option key={r} value={r}>
              {MEMBER_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="cursor-pointer rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background hover:opacity-90"
        >
          {initial ? 'Guardar' : 'Añadir'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
