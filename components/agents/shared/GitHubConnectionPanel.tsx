'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
}

function GitHubIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function RepoSkeleton() {
  return (
    <div className="space-y-2 px-1 py-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="h-7 w-7 shrink-0 animate-pulse rounded-md bg-border" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 animate-pulse rounded bg-border" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-border/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GitHubConnectionPanel({ reposListMaxHeight = 'max-h-48' }: { reposListMaxHeight?: string }) {
  const { user, isGithubConnected, githubUsername, linkGithub, disconnectGithub, refreshGithubStatus, authError, clearAuthError } = useAuth();
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [reposExpanded, setReposExpanded] = useState(false);
  const [reposLoaded, setReposLoaded] = useState(false);
  const [linking, setLinking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const isGithubLinkedInAuth =
    user?.providerData.some((p) => p.providerId === 'github.com') ?? false;
  const showDisconnect = isGithubConnected || isGithubLinkedInAuth;

  const handleConnect = async () => {
    setLinking(true);
    setReposError(null);
    clearAuthError();
    try {
      await linkGithub();
    } finally {
      setLinking(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    clearAuthError();
    try {
      await disconnectGithub();
      setConfirmDisconnect(false);
      setRepos([]);
      setReposLoaded(false);
      setReposExpanded(false);
      setReposError(null);
    } catch {
      // authError is set in context
    } finally {
      setDisconnecting(false);
    }
  };

  const loadRepos = useCallback(async () => {
    if (!user) return;

    setLoadingRepos(true);
    setReposError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/github/repos', {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      const data = (await response.json()) as {
        repos?: GithubRepo[];
        error?: string;
      };

      if (!response.ok) {
        if (response.status === 401 && data.error === 'GitHub no conectado') {
          await refreshGithubStatus();
        }
        throw new Error(data.error ?? 'No se pudieron cargar los repositorios');
      }

      setRepos(data.repos ?? []);
      setReposLoaded(true);
    } catch (error) {
      setReposError(error instanceof Error ? error.message : 'Error al cargar repositorios');
    } finally {
      setLoadingRepos(false);
    }
  }, [user, refreshGithubStatus]);

  const toggleRepos = async () => {
    const next = !reposExpanded;
    setReposExpanded(next);

    if (next && !reposLoaded && !loadingRepos) {
      await loadRepos();
    }
  };

  const displayName = githubUsername ?? 'github';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface ring-1 ring-border/50">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-border/60 px-3.5 py-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#24292F] text-white shadow-sm">
          <GitHubIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">GitHub</h3>
            {isGithubConnected && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Activo
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-subtle">
            {isGithubConnected
              ? 'Por ahora solo se sincronizan repositorios.'
              : 'Conecta tu cuenta para sincronizar repositorios.'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3.5">
        {!isGithubConnected ? (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleConnect}
              disabled={linking || disconnecting}
              className={[
                'flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5',
                'bg-[#24292F] text-sm font-semibold text-white shadow-sm',
                'transition-all hover:bg-[#1b1f23] hover:shadow',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                'disabled:cursor-not-allowed disabled:opacity-60',
              ].join(' ')}
            >
              {linking ? (
                <>
                  <Spinner className="h-4 w-4 text-white" />
                  Conectando...
                </>
              ) : (
                <>
                  <GitHubIcon className="h-4 w-4" />
                  Conectar cuenta
                </>
              )}
            </button>
            {showDisconnect && (
              <div className="rounded-lg border border-border/60 bg-elevated/50 px-3 py-2.5">
                <p className="text-[11px] text-subtle">
                  GitHub sigue vinculado en tu cuenta de Klarify pero sin token activo. Desconéctalo
                  para volver a conectar.
                </p>
                {!confirmDisconnect ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDisconnect(true)}
                    className="mt-2 text-xs font-medium text-red-500 hover:underline"
                  >
                    Desconectar GitHub
                  </button>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-500/15 disabled:opacity-60"
                    >
                      {disconnecting ? 'Desconectando...' : 'Confirmar desconexión'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDisconnect(false)}
                      disabled={disconnecting}
                      className="text-xs text-subtle hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Perfil conectado */}
            <div className="flex items-center gap-3 rounded-lg bg-elevated px-3 py-2.5 ring-1 ring-border/40">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#24292F]/10 text-sm font-bold text-foreground">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">@{displayName}</p>
                <p className="text-[11px] text-subtle">Cuenta vinculada</p>
              </div>
              <a
                href={`https://github.com/${displayName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
                aria-label={`Ver perfil de @${displayName} en GitHub`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Acordeón de repos */}
            <div className="overflow-hidden rounded-lg border border-border/60">
              <button
                type="button"
                onClick={toggleRepos}
                aria-expanded={reposExpanded}
                className={[
                  'flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm font-medium',
                  'text-foreground transition-colors hover:bg-surface-hover',
                ].join(' ')}
              >
                <svg
                  className={[
                    'h-4 w-4 shrink-0 text-subtle transition-transform duration-200',
                    reposExpanded ? 'rotate-90' : '',
                  ].join(' ')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="flex-1">Repositorios</span>
                {reposLoaded && repos.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {repos.length}
                  </span>
                )}
                {loadingRepos && <Spinner className="h-3.5 w-3.5 text-subtle" />}
              </button>

              {reposExpanded && (
                <div className="border-t border-border/60 bg-elevated/50">
                  {loadingRepos && <RepoSkeleton />}

                  {!loadingRepos && reposError && (
                    <div className="space-y-2 px-3 py-3">
                      <p className="text-xs text-red-500" role="alert">
                        {reposError}
                      </p>
                      <button
                        type="button"
                        onClick={loadRepos}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Reintentar
                      </button>
                    </div>
                  )}

                  {!loadingRepos && !reposError && reposLoaded && repos.length === 0 && (
                    <p className="px-3 py-4 text-center text-xs text-subtle">
                      No se encontraron repositorios.
                    </p>
                  )}

                  {!loadingRepos && !reposError && repos.length > 0 && (
                    <ul className={`${reposListMaxHeight} space-y-0.5 overflow-y-auto p-1.5`}>
                      {repos.map((repo) => {
                        const [owner, name] = repo.full_name.split('/');
                        return (
                          <li key={repo.id}>
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={[
                                'group flex items-center gap-2.5 rounded-lg px-2 py-2',
                                'transition-colors hover:bg-surface-hover',
                              ].join(' ')}
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface ring-1 ring-border/50">
                                <svg
                                  className="h-3.5 w-3.5 text-subtle group-hover:text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={1.75}
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                  />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-foreground">{name}</p>
                                <p className="truncate text-[10px] text-subtle">{owner}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                {repo.private && (
                                  <span
                                    className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-subtle ring-1 ring-border/50"
                                    title="Repositorio privado"
                                  >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                  </span>
                                )}
                                <svg
                                  className="h-3.5 w-3.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  aria-hidden="true"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {!confirmDisconnect ? (
              <button
                type="button"
                onClick={() => setConfirmDisconnect(true)}
                disabled={disconnecting}
                className="w-full rounded-lg border border-border/60 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/5 disabled:opacity-60 cursor-pointer"
              >
                Desconectar GitHub
              </button>
            ) : (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
                <p className="text-[11px] leading-relaxed text-subtle">
                  Se eliminará el acceso a tus repositorios. Podrás volver a conectar GitHub cuando
                  quieras.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-500/15 disabled:opacity-60 cursor-pointer"
                  >
                    {disconnecting ? 'Desconectando...' : 'Confirmar desconexión'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDisconnect(false)}
                    disabled={disconnecting}
                    className="text-xs text-subtle hover:text-foreground cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {authError && (
          <p className="mt-2.5 rounded-lg bg-red-500/10 px-2.5 py-2 text-xs text-red-500" role="alert">
            {authError}
          </p>
        )}
      </div>
    </div>
  );
}
