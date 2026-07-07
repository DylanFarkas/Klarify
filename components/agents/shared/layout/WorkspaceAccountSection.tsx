'use client';

import { useAuth } from '@/context/AuthContext';

export function WorkspaceAccountSection() {
  const { user, signOut, loading } = useAuth();

  if (loading || !user) return null;

  const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="border-t border-border/60 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-2 ring-primary/10 text-sm font-bold text-primary">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          {user.email ? (
            <p className="truncate text-[11px] text-subtle">{user.email}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          title="Cerrar sesión"
          className="shrink-0 cursor-pointer rounded-lg p-2 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
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
    </div>
  );
}
