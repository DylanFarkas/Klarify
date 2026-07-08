'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api-client';
import { slugifyRepoName } from '@/lib/github/repo-utils';
import type { GithubExportResponse, GithubProjectSummary } from '@/lib/types/github-export';
import { lockPageScroll } from '@/lib/utils/scroll-lock';
import { DropdownSelect } from '@/components/ui/DropdownSelect';

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
}

type WizardStep = 'connection' | 'destination' | 'confirm';

interface GitHubExportModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  canExport: boolean;
}

export function GitHubExportModal({
  open,
  onClose,
  projectId,
  projectName,
  canExport,
}: GitHubExportModalProps) {
  const { user, isGithubConnected, githubUsername, linkGithub } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<WizardStep>('connection');
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [projects, setProjects] = useState<GithubProjectSummary[]>([]);
  const [repoMode, setRepoMode] = useState<'existing' | 'create'>('existing');
  const [selectedRepo, setSelectedRepo] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [projectMode, setProjectMode] = useState<'create' | 'existing'>('create');
  const [projectTitle, setProjectTitle] = useState(`${projectName} - Klarify`);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [linking, setLinking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeError, setScopeError] = useState(false);
  const [result, setResult] = useState<GithubExportResponse | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setStep('connection');
      setError(null);
      setScopeError(false);
      setResult(null);
      setExporting(false);
      setRepoMode('existing');
      setSelectedRepo('');
      setNewRepoName(slugifyRepoName(projectName));
      setNewRepoDescription(`Backlog de ${projectName} exportado desde Klarify`);
      setNewRepoPrivate(false);
      setProjectMode('create');
      setSelectedProjectId('');
    }
  }, [open, projectName]);

  const loadRepos = useCallback(async () => {
    if (!user) return;
    setLoadingRepos(true);
    setError(null);
    try {
      const response = await authFetch('/api/github/repos', user);
      const data = (await response.json()) as { repos?: GithubRepo[]; error?: string; code?: string };
      if (!response.ok) {
        if (data.code === 'GITHUB_SCOPE_REQUIRED' || response.status === 403) {
          setScopeError(true);
        }
        throw new Error(data.error ?? 'No se pudieron cargar los repositorios');
      }
      setRepos(data.repos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar repositorios');
    } finally {
      setLoadingRepos(false);
    }
  }, [user]);

  const loadProjects = useCallback(
    async (repoFullName?: string) => {
      if (!user) return;
      setLoadingProjects(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (repoFullName) {
          params.set('repoFullName', repoFullName);
        } else if (githubUsername) {
          params.set('owner', githubUsername);
        }
        const response = await authFetch(`/api/github/projects?${params.toString()}`, user);
        const data = (await response.json()) as {
          projects?: GithubProjectSummary[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? 'No se pudieron cargar los projects');
        }
        setProjects(data.projects ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar projects');
      } finally {
        setLoadingProjects(false);
      }
    },
    [user, githubUsername]
  );

  useEffect(() => {
    if (open && step === 'destination' && isGithubConnected && repos.length === 0 && repoMode === 'existing') {
      void loadRepos();
    }
  }, [open, step, isGithubConnected, repos.length, loadRepos, repoMode]);

  useEffect(() => {
    if (projectMode !== 'existing') return;
    if (repoMode === 'existing' && selectedRepo) {
      void loadProjects(selectedRepo);
      return;
    }
    if (repoMode === 'create' && githubUsername) {
      void loadProjects();
    }
  }, [selectedRepo, repoMode, projectMode, githubUsername, loadProjects]);

  const handleConnect = async () => {
    setLinking(true);
    setError(null);
    try {
      await linkGithub();
      setStep('destination');
      await loadRepos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar GitHub');
    } finally {
      setLinking(false);
    }
  };

  const targetRepoFullName =
    repoMode === 'existing'
      ? selectedRepo
      : githubUsername
        ? `${githubUsername}/${slugifyRepoName(newRepoName)}`
        : '';

  const isDestinationValid =
    repoMode === 'existing'
      ? Boolean(selectedRepo)
      : Boolean(newRepoName.trim()) &&
        /^[a-z0-9._-]+$/.test(slugifyRepoName(newRepoName));

  const handleExport = async () => {
    if (!user || !isDestinationValid) return;

    setExporting(true);
    setError(null);

    try {
      const response = await authFetch('/api/github/export', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          repo:
            repoMode === 'existing'
              ? { mode: 'existing', fullName: selectedRepo }
              : {
                  mode: 'create',
                  name: slugifyRepoName(newRepoName),
                  description: newRepoDescription.trim() || undefined,
                  private: newRepoPrivate,
                },
          destination: {
            mode: projectMode,
            projectTitle: projectMode === 'create' ? projectTitle : undefined,
            githubProjectId: projectMode === 'existing' ? selectedProjectId : undefined,
          },
        }),
      });

      const data = (await response.json()) as GithubExportResponse & {
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        if (data.code === 'GITHUB_SCOPE_REQUIRED') {
          setScopeError(true);
        }
        throw new Error(data.error ?? 'Error al exportar');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const unlock = lockPageScroll();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !exporting) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unlock();
    };
  }, [open, exporting, onClose]);

  if (!open || !mounted) return null;

  const storyCount =
    canExport && step === 'confirm'
      ? 'El backlog consolidado se exportará completo.'
      : null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={() => !exporting && onClose()}
        aria-label="Cerrar exportación"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-export-title"
        className="relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl max-h-[min(90vh,720px)]"
      >
        <div className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="github-export-title" className="text-base font-bold text-foreground">
                Exportar a GitHub Projects
              </h2>
              <p className="mt-1 text-xs text-subtle">{projectName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="cursor-pointer rounded-lg p-2 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            {(['connection', 'destination', 'confirm'] as WizardStep[]).map((item, index) => (
              <div
                key={item}
                className={`h-1 flex-1 rounded-full ${
                  step === item || (item === 'connection' && step !== 'connection')
                    ? 'bg-primary'
                    : 'bg-border'
                } ${step === 'confirm' && item !== 'confirm' ? 'bg-primary/60' : ''}`}
                aria-hidden="true"
                title={`Paso ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {result ? (
            <ExportSuccess result={result} onClose={onClose} />
          ) : (
            <>
              {error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              ) : null}

              {scopeError ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Necesitas reconectar GitHub para autorizar acceso a Projects. Desconecta y vuelve a
                  conectar tu cuenta.
                </div>
              ) : null}

              {!canExport ? (
                <div className="rounded-xl border border-border bg-elevated px-4 py-4 text-sm text-muted">
                  Completa la planificación de sprints (Agente 5) antes de exportar el backlog a
                  GitHub.
                </div>
              ) : null}

              {step === 'connection' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted">
                    Conecta tu cuenta de GitHub para exportar épicas, historias, criterios de
                    aceptación, estimaciones, prioridades y sprints.
                  </p>
                  {isGithubConnected ? (
                    <p className="text-sm text-foreground">
                      Conectado como <span className="font-semibold">@{githubUsername}</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleConnect()}
                      disabled={linking}
                      className=" cursor-pointer w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {linking ? 'Conectando…' : 'Conectar GitHub'}
                    </button>
                  )}
                </div>
              )}

              {step === 'destination' && (
                <div className="space-y-5">
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-foreground">Repositorio</legend>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
                      <input
                        type="radio"
                        name="repo-mode"
                        checked={repoMode === 'existing'}
                        onChange={() => setRepoMode('existing')}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          Usar repositorio existente
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          Elige uno de tus repositorios en GitHub.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
                      <input
                        type="radio"
                        name="repo-mode"
                        checked={repoMode === 'create'}
                        onChange={() => setRepoMode('create')}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          Crear repositorio nuevo
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          Se creará en tu cuenta {githubUsername ? `@${githubUsername}` : 'de GitHub'}.
                        </span>
                      </span>
                    </label>
                  </fieldset>

                  {repoMode === 'existing' ? (
                    <div>
                      <label htmlFor="export-repo" className="text-sm font-semibold text-foreground">
                        Repositorio destino
                      </label>
                      <DropdownSelect
                        id="export-repo"
                        value={selectedRepo}
                        onChange={setSelectedRepo}
                        disabled={loadingRepos}
                        className="mt-2 cursor-pointer"
                        placeholder={
                          loadingRepos ? 'Cargando repositorios…' : 'Selecciona un repositorio'
                        }
                        options={repos.map((repo) => ({
                          value: repo.full_name,
                          label: `${repo.full_name}${repo.private ? ' (privado)' : ''}`,
                        }))}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="new-repo-name" className="text-sm font-semibold text-foreground">
                          Nombre del repositorio
                        </label>
                        <div className="mt-2 flex overflow-hidden rounded-xl border border-border bg-background">
                          {githubUsername ? (
                            <span className="flex items-center border-r border-border bg-elevated px-3 text-sm text-muted">
                              {githubUsername}/
                            </span>
                          ) : null}
                          <input
                            id="new-repo-name"
                            type="text"
                            value={newRepoName}
                            onChange={(event) => setNewRepoName(event.target.value)}
                            placeholder="mi-proyecto-klarify"
                            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none"
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-muted">
                          Solo letras minúsculas, números, puntos, guiones y guiones bajos.
                        </p>
                      </div>
                      <div>
                        <label htmlFor="new-repo-description" className="text-sm font-semibold text-foreground">
                          Descripción (opcional)
                        </label>
                        <input
                          id="new-repo-description"
                          type="text"
                          value={newRepoDescription}
                          onChange={(event) => setNewRepoDescription(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                        />
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={newRepoPrivate}
                          onChange={(event) => setNewRepoPrivate(event.target.checked)}
                        />
                        Repositorio privado
                      </label>
                    </div>
                  )}

                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-foreground">GitHub Project</legend>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
                      <input
                        type="radio"
                        name="project-mode"
                        checked={projectMode === 'create'}
                        onChange={() => setProjectMode('create')}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          Crear project nuevo
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          Se creará un GitHub Project vinculado al repositorio.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
                      <input
                        type="radio"
                        name="project-mode"
                        checked={projectMode === 'existing'}
                        onChange={() => setProjectMode('existing')}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          Usar project existente
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          Agrega issues al project que elijas.
                        </span>
                      </span>
                    </label>
                  </fieldset>

                  {projectMode === 'create' ? (
                    <div>
                      <label htmlFor="project-title" className="text-sm font-semibold text-foreground">
                        Título del project
                      </label>
                      <input
                        id="project-title"
                        type="text"
                        value={projectTitle}
                        onChange={(event) => setProjectTitle(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="existing-project" className="text-sm font-semibold text-foreground">
                        Project existente
                      </label>
                      <DropdownSelect
                        id="existing-project"
                        value={selectedProjectId}
                        onChange={setSelectedProjectId}
                        disabled={!isDestinationValid || loadingProjects}
                        className="mt-2"
                        placeholder={
                          loadingProjects ? 'Cargando projects…' : 'Selecciona un project'
                        }
                        options={projects.map((project) => ({
                          value: project.id,
                          label: `#${project.number} - ${project.title}`,
                        }))}
                      />
                    </div>
                  )}
                </div>
              )}

              {step === 'confirm' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted">
                    Se exportará el backlog completo de <strong>{projectName}</strong> a{' '}
                    <strong>{targetRepoFullName}</strong>
                    {repoMode === 'create' ? ' (repositorio nuevo)' : ''}.
                  </p>
                  <ul className="space-y-2 rounded-xl border border-border bg-elevated px-4 py-3 text-sm text-foreground">
                    {repoMode === 'create' ? <li>Repositorio nuevo con README inicial</li> : null}
                    <li>Épicas como issues con etiqueta dedicada</li>
                    <li>Historias con criterios de aceptación en el body</li>
                    <li>Story points, prioridad y sprint en campos del project</li>
                    <li>Milestones por sprint en el repositorio</li>
                  </ul>
                  {storyCount ? <p className="text-xs text-muted">{storyCount}</p> : null}
                  {exporting ? (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Spinner />
                        <p className="text-sm font-medium text-foreground">
                          Exportando… esto puede tardar unos segundos.
                        </p>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                        <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>

        {!result ? (
          <div className="shrink-0 flex gap-2 border-t border-border px-5 py-3">
            {step !== 'connection' ? (
              <button
                type="button"
                onClick={() =>
                  setStep(step === 'confirm' ? 'destination' : 'connection')
                }
                disabled={exporting}
                className="cursor-pointer rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
              >
                Atrás
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (step === 'connection') {
                  void (isGithubConnected ? setStep('destination') : handleConnect());
                  return;
                }
                if (step === 'destination') {
                  if (!isDestinationValid) return;
                  if (projectMode === 'create' && !projectTitle.trim()) return;
                  if (projectMode === 'existing' && !selectedProjectId) return;
                  setStep('confirm');
                  return;
                }
                void handleExport();
              }}
              disabled={
                !canExport ||
                exporting ||
                (step === 'destination' &&
                  (!isDestinationValid ||
                    (projectMode === 'create' && !projectTitle.trim()) ||
                    (projectMode === 'existing' && !selectedProjectId))) ||
                (step === 'connection' && linking)
              }
              className="cursor-pointer ml-auto rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting
                ? 'Exportando…'
                : step === 'confirm'
                  ? 'Exportar ahora'
                  : 'Continuar'}
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

function ExportSuccess({
  result,
  onClose,
}: {
  result: GithubExportResponse;
  onClose: () => void;
}) {
  const { summary } = result;
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-foreground">Exportación completada</h3>
      <p className="text-sm text-muted">
        {summary.storiesCreated + summary.storiesUpdated} historias ·{' '}
        {summary.epicsCreated + summary.epicsUpdated} épicas · {summary.milestonesCreated} milestones
        nuevos
      </p>
      {result.warnings?.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-900">
          {result.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        {result.repoCreated ? (
          <a
            href={result.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
          >
            Abrir repositorio
          </a>
        ) : null}
        <a
          href={result.githubProjectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Abrir GitHub Project
        </a>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="block w-full text-sm font-medium text-muted hover:text-foreground"
      >
        Cerrar
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
