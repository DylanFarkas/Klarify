'use client';

import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { getPlanDisplayName } from '@/lib/plans/plan-display';

export function WorkspaceAccountSection() {
  const { user, signOut, loading } = useAuth();
  const { plan } = useWorkspace();

  if (loading || !user) return null;

  const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();
  const planId = plan?.id ?? 'free';

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{displayName}</p>
        <p className="truncate text-xs text-subtle">Plan {getPlanDisplayName(planId)}</p>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        title="Cerrar sesión"
        className="shrink-0 cursor-pointer rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
          />
        </svg>
        <span className="sr-only">Cerrar sesión</span>
      </button>
    </div>
  );
}
