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
    <div className="space-y-2 py-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5">
          <div className="h-3 w-2/5 animate-pulse rounded bg-border" />
          <div className="h-2.5 w-1/4 animate-pulse rounded bg-border/70" />
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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-[15px] font-semibold tracking-tight text-foreground">GitHub</h4>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
            {isGithubConnected ? (
              <>
                <a
                  href={`https://github.com/${displayName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:underline"
                >
                  @{displayName}
                </a>
                {' · '}Exporta backlogs a GitHub Projects.
              </>
            ) : (
              'Conecta tu cuenta para exportar el backlog a GitHub Projects.'
            )}
          </p>
        </div>
        {isGithubConnected ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 pt-1 text-[11px] font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            Activo
          </span>
        ) : null}
      </div>

      {!isGithubConnected ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleConnect}
            disabled={linking || disconnecting}
            className={[
              'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2',
              'bg-foreground text-sm font-medium text-background',
              'transition-opacity hover:opacity-90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong',
              'disabled:cursor-not-allowed disabled:opacity-40',
            ].join(' ')}
          >
            {linking ? (
              <>
                <Spinner className="h-4 w-4" />
                Conectando…
              </>
            ) : (
              <>
                <GitHubIcon className="h-4 w-4" />
                Conectar cuenta
              </>
            )}
          </button>
          {showDisconnect && (
            <div>
              <p className="text-[12px] leading-relaxed text-muted">
                GitHub sigue vinculado en tu cuenta de Klarify pero sin token activo. Desconéctalo
                para volver a conectar.
              </p>
              {!confirmDisconnect ? (
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(true)}
                  className="mt-2 cursor-pointer text-[12px] font-medium text-muted transition-colors hover:text-danger"
                >
                  Desconectar GitHub
                </button>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="cursor-pointer text-[12px] font-medium text-danger hover:underline disabled:opacity-40"
                  >
                    {disconnecting ? 'Desconectando…' : 'Confirmar desconexión'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDisconnect(false)}
                    disabled={disconnecting}
                    className="cursor-pointer text-[12px] text-subtle hover:text-foreground"
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
          <div>
            <button
              type="button"
              onClick={toggleRepos}
              aria-expanded={reposExpanded}
              className="flex w-full cursor-pointer items-center gap-2 py-1 text-left text-[13px] font-medium text-foreground"
            >
              <svg
                className={[
                  'h-3.5 w-3.5 shrink-0 text-subtle transition-transform duration-200',
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
              <span>Repositorios</span>
              {reposLoaded && repos.length > 0 && (
                <span className="tabular-nums text-[11px] font-normal text-subtle">
                  {repos.length}
                </span>
              )}
              {loadingRepos && <Spinner className="h-3.5 w-3.5 text-subtle" />}
            </button>

            {reposExpanded && (
              <div className="mt-1">
                {loadingRepos && <RepoSkeleton />}

                {!loadingRepos && reposError && (
                  <div className="space-y-1.5 py-2">
                    <p className="text-xs text-danger" role="alert">
                      {reposError}
                    </p>
                    <button
                      type="button"
                      onClick={loadRepos}
                      className="text-xs font-medium text-foreground hover:underline"
                    >
                      Reintentar
                    </button>
                  </div>
                )}

                {!loadingRepos && !reposError && reposLoaded && repos.length === 0 && (
                  <p className="py-3 text-[12px] text-muted">No se encontraron repositorios.</p>
                )}

                {!loadingRepos && !reposError && repos.length > 0 && (
                  <ul className={`${reposListMaxHeight} overflow-y-auto`}>
                    {repos.map((repo) => {
                      const [owner, name] = repo.full_name.split('/');
                      return (
                        <li key={repo.id} className="border-t border-border/50 first:border-t-0">
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2 py-2 transition-colors hover:bg-surface-hover/40"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] text-foreground">{name}</p>
                              <p className="truncate text-[11px] text-subtle">{owner}</p>
                            </div>
                            {repo.private && (
                              <span title="Repositorio privado" className="shrink-0 text-subtle">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </span>
                            )}
                            <svg
                              className="h-3.5 w-3.5 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
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
              className="cursor-pointer text-[12px] font-medium text-muted transition-colors hover:text-danger disabled:opacity-40"
            >
              Desconectar GitHub
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] leading-relaxed text-muted">
                Se eliminará el acceso a tus repositorios. Podrás volver a conectar GitHub cuando
                quieras.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="cursor-pointer text-[12px] font-medium text-danger hover:underline disabled:opacity-40"
                >
                  {disconnecting ? 'Desconectando…' : 'Confirmar desconexión'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(false)}
                  disabled={disconnecting}
                  className="cursor-pointer text-[12px] text-subtle hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {authError && (
        <p className="text-xs text-danger" role="alert">
          {authError}
        </p>
      )}
    </div>
  );
}
