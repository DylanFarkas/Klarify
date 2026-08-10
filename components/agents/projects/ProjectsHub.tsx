'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { GitHubExportButton } from '@/components/agents/github/GitHubExportButton';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import type { ProjectSummary } from '@/lib/types/project';
import { PLAN_LIMITS } from '@/lib/plans/definitions';
import { errorMessage, notifyError, notifyPromise, notifySuccess } from '@/lib/notifications/toast';
import { getProjectEntryPath } from '@/lib/utils/project-progress';

const PROJECT_NAME_MAX = 80;

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
    isLoading,
  } = useWorkspace();

  const [creating, setCreating] = useState(false);
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
    if (canCreate && list.length === 0 && !isLoading) {
      nameInputRef.current?.focus();
    }
  }, [canCreate, list.length, isLoading]);

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

  const createSection = (
    <section
      className={`rounded-xl border p-5 ${
        list.length === 0 ? 'border-border bg-surface' : 'border-border/80 bg-surface/70'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground">
            {list.length === 0 ? 'Crea tu primer proyecto' : 'Nuevo proyecto'}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {list.length === 0
              ? 'Dale un nombre y empieza el pipeline de agentes.'
              : 'Pipeline independiente sin perder el progreso de los demás.'}
          </p>
        </div>
      </div>
      <form
        className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-start"
        onSubmit={(event) => void handleCreate(event)}
        noValidate
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="new-project-name" className="sr-only">
            Nombre del proyecto
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
            placeholder="Nombre del proyecto"
            required
            maxLength={PROJECT_NAME_MAX}
            disabled={!canCreate || creating}
            autoComplete="off"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'new-project-name-error' : undefined}
            className={`w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-subtle focus:border-border-strong disabled:cursor-not-allowed disabled:opacity-60 ${
              nameError ? 'border-red-300' : 'border-border'
            }`}
          />
          {nameError ? (
            <p id="new-project-name-error" className="mt-1.5 text-xs text-red-700">
              {nameError}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={!canSubmitCreate}
          className="shrink-0 cursor-pointer rounded-lg bg-foreground px-4.5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating ? 'Creando…' : 'Crear'}
        </button>
      </form>
      {!canCreate ? (
        <p className="mt-3 text-xs text-muted">
          Has alcanzado el límite de tu plan.{' '}
          <Link href="/#pricing" className="font-medium text-primary underline-offset-2 hover:underline">
            Mejorar plan
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-xs text-subtle">Enter para crear</p>
      )}
    </section>
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Proyectos</h1>
        <p className="text-sm leading-relaxed text-muted">
          Cada proyecto conserva su propio pipeline. Abre uno para continuar o crea uno nuevo.
        </p>
        {list.length > 0 ? (
          <p className="mt-1.5 text-[13px] text-subtle">
            {list.length} total · {activeCount} activos · {avgCompletion}% progreso medio
            {lockedCount > 0 ? ` · ${lockedCount} bloqueados` : ''}
          </p>
        ) : null}
      </header>

      {list.length === 0 ? createSection : null}

      {activeProject ? (
        <section className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs text-subtle">Continuar</p>
            <h2 className="mt-0.5 truncate text-[15px] font-semibold text-foreground">{activeProject.name}</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              {activeProject.pipelineLabel} · {activeProject.completionPercentage}%
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-border sm:block">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${activeProject.completionPercentage}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleOpen(activeProject)}
              className="cursor-pointer rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Abrir
            </button>
          </div>
        </section>
      ) : null}

      {list.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-foreground">GitHub</p>
            <p className="mt-0.5 text-[13px] text-muted">
              {githubEnabled
                ? isGithubConnected
                  ? `Conectado como @${githubUsername ?? 'usuario'}`
                  : 'Conecta tu cuenta para exportar el backlog'
                : 'Disponible en el plan Pro'}
            </p>
            {!canExportGithub && githubEnabled ? (
              <p className="mt-1 text-[13px] text-amber-600">
                Completa la planificación de sprints para habilitar la exportación.
              </p>
            ) : null}
          </div>
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
              className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              Ver plan Pro
            </Link>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {hasLockedProjects ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-5 py-4 text-sm text-amber-950">
          <p className="font-medium">{lockedCount} proyecto(s) bloqueado(s)</p>
          <p className="mt-1 text-sm text-amber-900/80">
            {canChangeSelection
              ? `Tu plan permite ${maxActive} activo(s). Elige cuál conservar; después no podrás cambiarlo hasta mejorar tu plan.`
              : `Tu plan permite ${maxActive} activo(s). Ya confirmaste tu selección; mejora tu plan para desbloquear más.`}
          </p>
          {canChangeSelection ? (
            <button
              type="button"
              onClick={() => setShowSlotManager((v) => !v)}
              className="mt-2.5 cursor-pointer text-sm font-medium text-amber-950 underline-offset-2 hover:underline"
            >
              {showSlotManager ? 'Ocultar selección' : 'Elegir proyecto activo'}
            </button>
          ) : (
            <Link
              href="/#pricing"
              className="mt-2.5 inline-block text-sm font-medium text-amber-950 underline-offset-2 hover:underline"
            >
              Mejorar plan
            </Link>
          )}
        </div>
      ) : null}

      {showSlotManager && canChangeSelection ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-[15px] font-semibold text-foreground">Proyectos activos</h3>
          <p className="mt-1 text-sm text-muted">{slotManagerHint}</p>
          <ul className="mt-3.5 space-y-1">
            {list.map((project) => {
              const checked = selectedActiveIds.includes(project.id);
              const disabled = maxActive > 1 && !checked && selectionFull;
              return (
                <li key={project.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      checked
                        ? 'bg-surface-hover'
                        : disabled
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:bg-surface-hover'
                    }`}
                  >
                    <input
                      type={maxActive === 1 ? 'radio' : 'checkbox'}
                      name={maxActive === 1 ? 'active-project' : undefined}
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleSelection(project.id)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {project.name}
                    </span>
                    <span className="text-xs text-subtle">
                      {project.status === 'locked' ? 'Bloqueado' : 'Activo'}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => void handleSaveActivation()}
              disabled={activating || selectedActiveIds.length === 0}
              className="cursor-pointer rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {activating ? 'Guardando…' : 'Confirmar'}
            </button>
            <Link
              href="/#pricing"
              className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              Mejorar plan
            </Link>
          </div>
        </section>
      ) : null}

      {list.length > 0 ? (
        <section>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <p className="text-xs font-medium text-subtle">Todos los proyectos</p>
            <p className="text-xs text-subtle">
              {list.length}/{maxProjects}
            </p>
          </div>
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            {list.map((project, index) => {
              const isLocked = project.status === 'locked';
              const isActive = project.id === activeProjectId && !isLocked;
              return (
                <li
                  key={project.id}
                  className={[
                    'group flex flex-col gap-3 px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between',
                    index > 0 ? 'border-t border-border' : '',
                    isLocked ? 'opacity-70' : 'hover:bg-surface-hover/60',
                    isActive ? 'bg-surface-hover/40' : '',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!isLocked) void handleOpen(project);
                      else if (canChangeSelection) setShowSlotManager(true);
                    }}
                    className="min-w-0 flex-1 cursor-pointer text-left disabled:cursor-not-allowed"
                    disabled={isLocked && !canChangeSelection}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-medium text-foreground">{project.name}</h2>
                      {isLocked ? (
                        <span className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                          Bloqueado
                        </span>
                      ) : isActive ? (
                        <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                          Activo
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {project.pipelineLabel} · {project.completionPercentage}%
                    </p>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="mr-1 hidden text-xs tabular-nums text-subtle sm:inline">
                      {formatRelativeDate(project.updatedAt)}
                    </span>

                    {isLocked ? (
                      canChangeSelection ? (
                        <button
                          type="button"
                          onClick={() => setShowSlotManager(true)}
                          className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-background"
                        >
                          Elegir
                        </button>
                      ) : (
                        <Link
                          href="/#pricing"
                          className="rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-background"
                        >
                          Mejorar
                        </Link>
                      )
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleOpen(project)}
                          className="cursor-pointer rounded-md bg-foreground px-3 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
                        >
                          Abrir
                        </button>
                        {project.pipelineStep >= 6 && (plan?.limits.executionBoard ?? false) ? (
                          <button
                            type="button"
                            onClick={() => void handleOpenBoard(project)}
                            className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-background"
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
                      className="cursor-pointer rounded-md px-2.5 py-1.5 text-[13px] font-medium text-subtle transition-all hover:bg-red-50 hover:text-red-700 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      aria-label={`Eliminar ${project.name}`}
                    >
                      {deletingId === project.id ? '…' : 'Eliminar'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {list.length > 0 ? createSection : null}
    </div>
  );
}
