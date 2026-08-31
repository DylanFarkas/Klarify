'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { GitHubExportButton } from '@/components/agents/github/GitHubExportButton';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import type { ProjectSummary } from '@/lib/types/project';
import { PLAN_LIMITS } from '@/lib/plans/definitions';
import { errorMessage, notifyError, notifyPromise, notifySuccess } from '@/lib/notifications/toast';
import { getProjectEntryPath } from '@/lib/utils/project-progress';

const PROJECT_NAME_MAX = 80;
const PIPELINE_DOTS = 5;

const ROW_GRID =
  'grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_8.5rem_4.5rem_11.5rem] sm:gap-4';

function formatRelativeDate(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d`;
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp));
}

function PipelineDots({ percentage, label }: { percentage: number; label: string }) {
  const filled = Math.min(PIPELINE_DOTS, Math.round(percentage / (100 / PIPELINE_DOTS)));
  return (
    <span className="inline-flex items-center gap-2" title={`${label} · ${percentage}%`}>
      <span className="inline-flex items-center gap-1" aria-hidden>
        {Array.from({ length: PIPELINE_DOTS }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 w-1.5 rounded-full ${index < filled ? 'bg-foreground' : 'bg-border'}`}
          />
        ))}
      </span>
      <span className="text-[12px] tabular-nums text-subtle">{percentage}%</span>
    </span>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

interface ProjectsHubProps {
  initialProjects: ProjectSummary[];
}

export function ProjectsHub({ initialProjects }: ProjectsHubProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const { isGithubConnected, githubUsername } = useAuth();
  const {
    plan,
    workspace,
    projects,
    projectSlots,
    activeProjectId,
    createProject,
    switchProject,
    activateProjects,
    deleteProject,
    refreshProjects,
  } = useWorkspace();

  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSlotManager, setShowSlotManager] = useState(false);
  const [selectedActiveIds, setSelectedActiveIds] = useState<string[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const list = projects.length > 0 ? projects : initialProjects;
  const maxProjects = plan?.limits.maxProjects ?? PLAN_LIMITS.free.maxProjects;
  const maxActive = projectSlots?.maxActive ?? maxProjects;
  const activeCount = projectSlots?.activeCount ?? list.filter((p) => p.status === 'active').length;
  const lockedCount = projectSlots?.lockedCount ?? list.filter((p) => p.status === 'locked').length;
  const canChangeSelection = projectSlots?.canChangeSelection ?? false;
  const canCreate = list.length < maxProjects;
  const trimmedName = newName.trim();
  const canSubmitCreate = canCreate && trimmedName.length > 0 && !creating;

  const hasLockedProjects = lockedCount > 0;

  useEffect(() => {
    const activeIds = list.filter((p) => p.status === 'active').map((p) => p.id);
    setSelectedActiveIds(activeIds);
  }, [list]);

  useEffect(() => {
    if (canChangeSelection) {
      setShowSlotManager(true);
    }
  }, [canChangeSelection]);

  useEffect(() => {
    if (!createOpen) return;
    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 140);
    return () => window.clearTimeout(timer);
  }, [createOpen]);

  const selectionFull = selectedActiveIds.length >= maxActive;

  const toggleSelection = useCallback(
    (projectId: string) => {
      setSelectedActiveIds((prev) => {
        if (maxActive === 1) {
          return [projectId];
        }
        if (prev.includes(projectId)) {
          return prev.filter((id) => id !== projectId);
        }
        if (prev.length >= maxActive) {
          return prev;
        }
        return [...prev, projectId];
      });
    },
    [maxActive]
  );

  const handleOpen = useCallback(
    async (project: ProjectSummary) => {
      if (project.status === 'locked') {
        if (canChangeSelection) {
          setError('Confirma qué proyecto quieres desbloquear en la sección de arriba.');
          setShowSlotManager(true);
        } else {
          setError('Este proyecto está bloqueado. Mejora tu plan para acceder a más proyectos.');
        }
        return;
      }
      setError(null);
      try {
        if (project.id !== activeProjectId) {
          await switchProject(project.id);
        }
        router.push(getProjectEntryPath(project));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo abrir el proyecto');
      }
    },
    [activeProjectId, canChangeSelection, router, switchProject]
  );

  const handleOpenBoard = useCallback(
    async (project: ProjectSummary) => {
      if (project.status === 'locked') return;
      setError(null);
      try {
        if (project.id !== activeProjectId) {
          await switchProject(project.id);
        }
        router.push('/agentes/board');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo abrir el tablero');
      }
    },
    [activeProjectId, router, switchProject]
  );

  const handleCreate = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!canCreate || creating) return;

      const name = newName.trim();
      if (!name) {
        setNameError('Escribe un nombre para el proyecto.');
        nameInputRef.current?.focus();
        return;
      }

      setCreating(true);
      setError(null);
      setNameError(null);
      try {
        // createProject ya actualiza la lista y el proyecto activo en contexto
        await createProject(name);
        setNewName('');
        setCreateOpen(false);
        notifySuccess({ title: 'Proyecto creado', description: name });
        router.push('/agentes/1');
      } catch (err) {
        const message = errorMessage(err, 'No se pudo crear el proyecto');
        setError(message);
        notifyError(message);
        setCreating(false);
        nameInputRef.current?.focus();
      }
    },
    [canCreate, createProject, creating, newName, router]
  );

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setNameError(null);
    setCreateOpen(true);
  }, [canCreate]);

  const closeCreate = useCallback(() => {
    if (creating) return;
    setCreateOpen(false);
    setNameError(null);
  }, [creating]);

  const handleSaveActivation = useCallback(async () => {
    if (selectedActiveIds.length === 0) {
      setError('Selecciona al menos un proyecto activo.');
      return;
    }
    setActivating(true);
    setError(null);
    try {
      await notifyPromise(activateProjects(selectedActiveIds), {
        loading: 'Activando proyectos…',
        success: 'Proyectos activos actualizados',
        error: (err) => errorMessage(err, 'No se pudieron activar los proyectos'),
      });
      setShowSlotManager(false);
    } catch {
      // Toast de error ya mostrado por notifyPromise
    } finally {
      setActivating(false);
    }
  }, [activateProjects, selectedActiveIds]);

  const handleDelete = useCallback(
    async (project: ProjectSummary) => {
      const confirmed = await confirm({
        title: `¿Eliminar "${project.name}"?`,
        description: 'Se borrará todo el progreso del pipeline y no se puede deshacer.',
        confirmLabel: 'Eliminar',
        variant: 'danger',
      });
      if (!confirmed) return;

      setDeletingId(project.id);
      setError(null);
      try {
        await deleteProject(project.id);
        await refreshProjects();
        notifySuccess({ title: 'Proyecto eliminado', description: project.name });
      } catch (err) {
        const message = errorMessage(err, 'No se pudo eliminar el proyecto');
        setError(message);
        notifyError(message);
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, deleteProject, refreshProjects]
  );

  const slotManagerHint = useMemo(() => {
    if (maxActive === 1) {
      return 'Tu plan permite 1 proyecto activo. Elige cuál conservar desbloqueado. Esta elección es definitiva hasta que mejores tu plan.';
    }
    return `Tu plan permite ${maxActive} proyectos activos. Marca hasta ${maxActive} para desbloquearlos. Esta elección es definitiva hasta que mejores tu plan.`;
  }, [maxActive]);

  const activeProject = useMemo(
    () => list.find((p) => p.id === activeProjectId && p.status === 'active'),
    [list, activeProjectId]
  );

  const avgCompletion = useMemo(() => {
    const activeProjects = list.filter((p) => p.status === 'active');
    if (activeProjects.length === 0) return 0;
    const total = activeProjects.reduce((sum, p) => sum + p.completionPercentage, 0);
    return Math.round(total / activeProjects.length);
  }, [list]);

  const githubEnabled = plan?.limits.github ?? false;
  const exportProject = activeProject ?? list.find((p) => p.id === activeProjectId) ?? null;
  const canExportGithub = Boolean(
    exportProject && workspace?.pipeline.agent6Input && exportProject.status === 'active'
  );

  const metaParts = [
    `${list.length}/${maxProjects}`,
    `${activeCount} activo${activeCount !== 1 ? 's' : ''}`,
    `${avgCompletion}% progreso medio`,
    lockedCount > 0 ? `${lockedCount} bloqueado${lockedCount !== 1 ? 's' : ''}` : null,
    isGithubConnected && githubUsername ? `@${githubUsername}` : null,
  ].filter(Boolean);

  return (
    <div className="flex w-full flex-col gap-5 px-6 pt-3 pb-5 animate-[fadeIn_0.3s_ease-out] md:gap-6">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 border-b border-border/60 pb-3">
        <div className="min-w-0">
          <h1 className="text-[50px] font-semibold tracking-tight text-foreground">Proyectos</h1>
          <p className="mt-0.5 text-[12px] text-muted">
            {list.length === 0 ? (
              'Cada proyecto conserva su propio pipeline. Crea el primero para empezar.'
            ) : (
              <>
                Cada proyecto conserva su propio pipeline
                {' · '}
                <span className="tabular-nums text-subtle">{metaParts.join(' · ')}</span>
              </>
            )}
          </p>
        </div>

        {list.length > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {githubEnabled && exportProject ? (
              <GitHubExportButton
                projectId={exportProject.id}
                projectName={exportProject.name}
                canExport={canExportGithub}
                variant="secondary"
              />
            ) : !githubEnabled ? (
              <Link
                href="/#pricing"
                className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                GitHub en Pro
              </Link>
            ) : null}
            {activeProject ? (
              <button
                type="button"
                onClick={() => void handleOpen(activeProject)}
                className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Continuar
              </button>
            ) : null}
            {canCreate ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
              >
                <PlusIcon />
                Nuevo proyecto
              </button>
            ) : (
              <Link
                href="/#pricing"
                className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Mejorar plan
              </Link>
            )}
          </div>
        ) : null}
      </header>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {hasLockedProjects && !showSlotManager ? (
        <p className="text-[13px] text-muted">
          {lockedCount} proyecto{lockedCount !== 1 ? 's' : ''} bloqueado{lockedCount !== 1 ? 's' : ''}.{' '}
          {canChangeSelection ? (
            <>
              Tu plan permite {maxActive} activo{maxActive !== 1 ? 's' : ''}.{' '}
              <button
                type="button"
                onClick={() => setShowSlotManager(true)}
                className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline"
              >
                Elegir proyecto activo
              </button>
            </>
          ) : (
            <>
              Ya confirmaste tu selección.{' '}
              <Link href="/#pricing" className="font-medium text-primary underline-offset-2 hover:underline">
                Mejorar plan
              </Link>
            </>
          )}
        </p>
      ) : null}

      {showSlotManager && canChangeSelection ? (
        <section className="rounded-xl border border-border/60 bg-surface">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3 md:px-5">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Proyectos activos</h2>
              <p className="mt-0.5 text-[13px] text-muted">{slotManagerHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSlotManager(false)}
              className="cursor-pointer text-[12px] font-medium text-subtle transition-colors hover:text-foreground"
            >
              Ocultar
            </button>
          </div>
          <ul>
            {list.map((project) => {
              const checked = selectedActiveIds.includes(project.id);
              const disabled = maxActive > 1 && !checked && selectionFull;
              return (
                <li key={project.id} className="border-t border-border/60 first:border-t-0">
                  <label
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors md:px-5 ${
                      checked
                        ? 'bg-elevated'
                        : disabled
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:bg-surface-hover/30'
                    }`}
                  >
                    <input
                      type={maxActive === 1 ? 'radio' : 'checkbox'}
                      name={maxActive === 1 ? 'active-project' : undefined}
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleSelection(project.id)}
                      className="h-4 w-4 accent-foreground"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {project.name}
                    </span>
                    <span className="text-[12px] text-subtle">
                      {project.status === 'locked' ? 'Bloqueado' : 'Activo'}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 py-3 md:px-5">
            <button
              type="button"
              onClick={() => void handleSaveActivation()}
              disabled={activating || selectedActiveIds.length === 0}
              className="cursor-pointer rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-text disabled:opacity-40"
            >
              {activating ? 'Guardando…' : 'Confirmar'}
            </button>
            <Link
              href="/#pricing"
              className="inline-flex items-center rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              Mejorar plan
            </Link>
          </div>
        </section>
      ) : null}

      {list.length === 0 ? (
        <section className="mx-auto flex w-full max-w-lg flex-col items-center px-5 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted">
            <svg
              className="h-6 w-6 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
              />
            </svg>
          </div>
          <h2 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
            Crea tu primer proyecto
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
            Un proyecto es un pipeline propio. Ponle un nombre y empiezas en el Agente 1.
          </p>
          <div className="mt-6">
            {canCreate ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                <PlusIcon />
                Crear proyecto
              </button>
            ) : (
              <Link
                href="/#pricing"
                className="inline-flex rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Mejorar plan
              </Link>
            )}
          </div>
        </section>
      ) : (
        <>
          <section>
            <div
              className={`${ROW_GRID} mb-1 hidden pb-2 sm:grid`}
            >
              <p className="text-[11px] font-medium tracking-[0.12em] text-subtle uppercase">
                Proyecto
              </p>
              <p className="text-[11px] font-medium tracking-[0.12em] text-subtle uppercase">
                Etapa
              </p>
              <p className="text-[11px] font-medium tracking-[0.12em] text-subtle uppercase">
                Progreso
              </p>
              <p className="text-[11px] font-medium tracking-[0.12em] text-subtle uppercase">
                Fecha
              </p>
              <p className="sr-only">Acciones</p>
            </div>

            <ul>
              {list.map((project) => {
                const isLocked = project.status === 'locked';
                const isCurrent = project.id === activeProjectId && !isLocked;
                return (
                  <li
                    key={project.id}
                    className={[
                      'group border-b border-border/60',
                      isLocked ? 'opacity-70' : '',
                    ].join(' ')}
                  >
                    <div
                      className={`${ROW_GRID} px-0 py-4 transition-colors ${
                        isLocked ? '' : 'hover:bg-surface-hover/30'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!isLocked) void handleOpen(project);
                          else if (canChangeSelection) setShowSlotManager(true);
                        }}
                        className="min-w-0 cursor-pointer text-left disabled:cursor-not-allowed"
                        disabled={isLocked && !canChangeSelection}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              isLocked ? 'bg-subtle' : isCurrent ? 'bg-primary' : 'bg-foreground/35'
                            }`}
                            aria-hidden
                          />
                          <span className="truncate text-sm font-medium text-foreground">
                            {project.name}
                          </span>
                          {isLocked ? (
                            <span className="shrink-0 text-[11px] text-subtle">Bloqueado</span>
                          ) : isCurrent ? (
                            <span className="shrink-0 text-[11px] text-primary">Actual</span>
                          ) : null}
                        </div>
                        <p className="mt-1 pl-4 text-[12px] text-muted sm:hidden">
                          {project.pipelineLabel} · {project.completionPercentage}%
                          <span className="text-subtle"> · {formatRelativeDate(project.updatedAt)}</span>
                        </p>
                      </button>

                      <p className="hidden truncate text-[13px] text-muted sm:block">
                        {project.pipelineLabel}
                      </p>

                      <div className="hidden sm:block">
                        <PipelineDots
                          percentage={project.completionPercentage}
                          label={project.pipelineLabel}
                        />
                      </div>

                      <span className="hidden text-[12px] tabular-nums text-subtle sm:block">
                        {formatRelativeDate(project.updatedAt)}
                      </span>

                      <div className="flex shrink-0 items-center justify-end gap-1.5">
                        {isLocked ? (
                          canChangeSelection ? (
                            <button
                              type="button"
                              onClick={() => setShowSlotManager(true)}
                              className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                            >
                              Elegir
                            </button>
                          ) : (
                            <Link
                              href="/#pricing"
                              className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                            >
                              Mejorar
                            </Link>
                          )
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleOpen(project)}
                              className="cursor-pointer rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
                            >
                              Abrir
                            </button>
                            {project.pipelineStep >= 6 && (plan?.limits.executionBoard ?? false) ? (
                              <button
                                type="button"
                                onClick={() => void handleOpenBoard(project)}
                                className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                              >
                                Gestionar
                              </button>
                            ) : null}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDelete(project)}
                          disabled={deletingId === project.id}
                          className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted transition-all hover:bg-red-500/10 hover:text-danger focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          aria-label={`Eliminar ${project.name}`}
                          title="Eliminar"
                        >
                          {deletingId === project.id ? '…' : <TrashIcon />}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <DetailModal
        open={createOpen}
        onClose={closeCreate}
        eyebrow="Proyectos"
        title="Nuevo proyecto"
        maxWidth="md"
        compact
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeCreate}
              disabled={creating}
              className="cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canSubmitCreate}
              onClick={() => void handleCreate()}
              className={[
                'cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-opacity',
                canSubmitCreate
                  ? 'bg-foreground text-background hover:opacity-90'
                  : 'cursor-not-allowed bg-disabled text-disabled-text opacity-40',
              ].join(' ')}
            >
              {creating ? 'Creando…' : 'Crear y abrir'}
            </button>
          </div>
        }
      >
        <form onSubmit={(event) => void handleCreate(event)} noValidate>
          <p className="text-[13px] leading-relaxed text-muted">
            Empieza un pipeline desde el Agente 1. El resto de proyectos no cambia.
          </p>
          <label htmlFor="new-project-name" className="mt-4 block text-[12px] font-medium text-muted">
            Nombre
          </label>
          <input
            ref={nameInputRef}
            id="new-project-name"
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Ej. App de reservas"
            required
            maxLength={PROJECT_NAME_MAX}
            disabled={!canCreate || creating}
            autoComplete="off"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'new-project-name-error' : undefined}
            className={`mt-1.5 w-full rounded-lg border bg-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-subtle focus:border-border-strong disabled:cursor-not-allowed disabled:opacity-60 ${
              nameError ? 'border-danger/40' : 'border-border'
            }`}
          />
          {nameError ? (
            <p id="new-project-name-error" className="mt-1.5 text-[12px] text-danger">
              {nameError}
            </p>
          ) : (
            <p className="mt-1.5 text-[12px] text-subtle">{list.length}/{maxProjects} proyectos en tu plan</p>
          )}
        </form>
      </DetailModal>
    </div>
  );
}
