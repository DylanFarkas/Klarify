'use client';

import type { ProjectMember } from '@/lib/types/execution';
import { memberInitials } from '@/lib/board/board-utils';
import { useSettingsModal } from '@/context/SettingsModalContext';

interface TeamPanelProps {
  members: ProjectMember[];
  maxMembers: number;
}

export function TeamPanel({ members, maxMembers }: TeamPanelProps) {
  const { openSettings } = useSettingsModal();
  const visibleAvatars = members.slice(0, 4);
  const overflow = members.length - visibleAvatars.length;
  const isEmpty = members.length === 0;

  return (
    <button
      type="button"
      onClick={() => openSettings('team')}
      aria-label={isEmpty ? 'Añadir equipo' : 'Gestionar equipo'}
      className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-hover focus:border-border-strong focus:outline-none"
    >
      <span className="flex items-center">
        {visibleAvatars.length > 0 ? (
          <span className="flex -space-x-1.5">
            {visibleAvatars.map((member) => (
              <span
                key={member.id}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface text-[9px] font-medium text-white"
                style={{ backgroundColor: member.avatarColor }}
                title={member.displayName}
              >
                {memberInitials(member.displayName)}
              </span>
            ))}
            {overflow > 0 ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-surface-hover text-[9px] font-medium text-muted">
                +{overflow}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-hover text-subtle">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </span>
        )}
      </span>
      <span className="text-xs font-medium text-muted">
        {isEmpty ? (
          'Añadir equipo'
        ) : (
          <>
            Equipo
            <span className="ml-1 text-subtle">
              ({members.length}/{maxMembers})
            </span>
          </>
        )}
      </span>
    </button>
  );
}
