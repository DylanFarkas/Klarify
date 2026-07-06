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

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-3 rounded-xl border border-border bg-background/60 ${compact ? 'p-3' : 'p-4'}`}
    >
      <div>
        <label htmlFor="member-name" className="text-[11px] font-bold uppercase tracking-wide text-subtle">
          Nombre
        </label>
        <input
          id="member-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
          required
        />
      </div>
      <div>
        <label htmlFor="member-email" className="text-[11px] font-bold uppercase tracking-wide text-subtle">
          Email (opcional)
        </label>
        <input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="member-role" className="text-[11px] font-bold uppercase tracking-wide text-subtle">
          Rol
        </label>
        <select
          id="member-role"
          value={role}
          onChange={(e) => setRole(e.target.value as ProjectMemberRole)}
          className="mt-1 w-full rounded-lg border border-border bg-surface text-foreground px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
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
          className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90"
        >
          {initial ? 'Guardar' : 'Añadir'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted hover:bg-surface-hover"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
