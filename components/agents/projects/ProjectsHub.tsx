'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { GitHubExportButton } from '@/components/agents/github/GitHubExportButton';
import type { ProjectSummary } from '@/lib/types/project';
import { PLAN_LIMITS } from '@/lib/plans/definitions';
import { getProjectEntryPath } from '@/lib/utils/project-progress';

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function planLabel(planId: string): string {
  if (planId === 'starter') return 'Starter';
  if (planId === 'pro') return 'Pro';
  return 'Free';
}

interface ProjectsHubProps {
  initialProjects: ProjectSummary[];
}

export function ProjectsHub({ initialProjects }: ProjectsHubProps) {
  const router = useRouter();
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
  const [error, setError] = useState<string | null>(null);
  const [showSlotManager, setShowSlotManager] = useState(false);
  const [selectedActiveIds, setSelectedActiveIds] = useState<string[]>([]);

  const list = projects.length > 0 ? projects : initialProjects;
  const maxProjects = plan?.limits.maxProjects ?? PLAN_LIMITS.free.maxProjects;
  const maxActive = projectSlots?.maxActive ?? maxProjects;
  const activeCount = projectSlots?.activeCount ?? list.filter((p) => p.status === 'active').length;
  const lockedCount = projectSlots?.lockedCount ?? list.filter((p) => p.status === 'locked').length;
  const canChangeSelection = projectSlots?.canChangeSelection ?? false;
  const canCreate = list.length < maxProjects;

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

  const handleCreate = useCallback(async () => {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      await createProject(newName.trim() || undefined);
      setNewName('');
      await refreshProjects();
      router.push('/agentes/1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el proyecto');
    } finally {
      setCreating(false);
    }
  }, [canCreate, createProject, newName, refreshProjects, router]);

  const handleSaveActivation = useCallback(async () => {
    if (selectedActiveIds.length === 0) {
      setError('Selecciona al menos un proyecto activo.');
      return;
    }
    setActivating(true);
    setError(null);
    try {
      await activateProjects(selectedActiveIds);
      setShowSlotManager(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron activar los proyectos');
    } finally {
      setActivating(false);
    }
  }, [activateProjects, selectedActiveIds]);

  const handleDelete = useCallback(
    async (project: ProjectSummary) => {
      const confirmed = window.confirm(
        `¿Eliminar "${project.name}"? Se borrará todo el progreso del pipeline y no se puede deshacer.`
      );
      if (!confirmed) return;

      setDeletingId(project.id);
      setError(null);
      try {
        await deleteProject(project.id);
        await refreshProjects();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar el proyecto');
      } finally {
        setDeletingId(null);
      }
    },
    [deleteProject, refreshProjects]
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Tus proyectos
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Cada proyecto conserva su propio pipeline de agentes. Elige uno para continuar o crea uno
          nuevo.
        </p>
      </header>

      {list.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Proyectos totales', value: String(list.length), hint: `Máx. ${maxProjects}` },
            { label: 'Activos', value: String(activeCount), hint: `${maxActive} permitidos` },
            { label: 'Progreso medio', value: `${avgCompletion}%`, hint: 'Proyectos activos' },
            {
              label: 'Bloqueados',
              value: String(lockedCount),
              hint: lockedCount > 0 ? 'Mejora tu plan' : 'Ninguno',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-surface/80 px-4 py-4 backdrop-blur-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-0.5 text-xs text-muted">{stat.hint}</p>
            </div>
          ))}
        </section>
      ) : null}

      {activeProject ? (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Continuar donde lo dejaste
              </p>
              <h2 className="mt-1 truncate text-xl font-bold text-foreground">{activeProject.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {activeProject.pipelineLabel} · {activeProject.completionPercentage}% completado
              </p>
              <div className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${activeProject.completionPercentage}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleOpen(activeProject)}
              className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Continuar
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface/80 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Exportar a GitHub</p>
            <p className="mt-1 text-xs text-muted">
              {githubEnabled
                ? isGithubConnected
                  ? `Conectado como @${githubUsername ?? 'usuario'}. Exporta el backlog a GitHub Projects.`
                  : 'Conecta tu cuenta para exportar épicas, historias y sprints.'
                : 'Disponible en el plan Pro.'}
            </p>
            {!canExportGithub && githubEnabled ? (
              <p className="mt-2 text-xs text-amber-600">
                Completa la planificación de sprints en el proyecto activo para habilitar la exportación.
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
              className="shrink-0 rounded-xl border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              Ver plan Pro
            </Link>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {hasLockedProjects ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-semibold">Tienes {lockedCount} proyecto(s) bloqueado(s)</p>
          <p className="mt-1 text-amber-900/80">
            {canChangeSelection
              ? `Tu plan actual permite ${maxActive} proyecto(s) activo(s). Elige cuál conservar; después no podrás cambiarlo hasta mejorar tu plan.`
              : `Tu plan actual permite ${maxActive} proyecto(s) activo(s). Ya confirmaste tu selección; mejora tu plan para desbloquear más.`}
          </p>
          {canChangeSelection ? (
            <button
              type="button"
              onClick={() => setShowSlotManager((v) => !v)}
              className="mt-3 text-sm font-semibold text-amber-950 underline-offset-2 hover:underline"
            >
              {showSlotManager ? 'Ocultar selección' : 'Elegir proyecto activo'}
            </button>
          ) : (
            <Link
              href="/#pricing"
              className="mt-3 inline-block text-sm font-semibold text-amber-950 underline-offset-2 hover:underline"
            >
              Mejorar plan
            </Link>
          )}
        </div>
      ) : null}

      {showSlotManager && canChangeSelection ? (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-base font-semibold text-foreground">Proyectos activos</h3>
          <p className="mt-1 text-sm text-muted">{slotManagerHint}</p>
          <ul className="mt-4 space-y-2">
            {list.map((project) => {
              const checked = selectedActiveIds.includes(project.id);
              const disabled = maxActive > 1 && !checked && selectionFull;
              return (
                <li key={project.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      checked
                        ? 'border-primary/40 bg-primary/5'
                        : disabled
                          ? 'cursor-not-allowed border-border opacity-50'
                          : 'border-border hover:border-primary/30'
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
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSaveActivation()}
              disabled={activating || selectedActiveIds.length === 0}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {activating ? 'Guardando...' : 'Confirmar selección'}
            </button>
            <Link
              href="/#pricing"
              className="inline-flex items-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background"
            >
              Mejorar plan
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4">
        {list.length === 0 && !isLoading ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
            <p className="text-muted">Aún no tienes proyectos. Crea el primero para empezar.</p>
          </div>
        ) : (
          list.map((project) => {
            const isLocked = project.status === 'locked';
            return (
              <article
                key={project.id}
                className={`flex flex-col gap-4 rounded-2xl border bg-surface p-5 transition-shadow sm:flex-row sm:items-center sm:justify-between ${
                  isLocked
                    ? 'border-border opacity-75'
                    : project.id === activeProjectId
                      ? 'border-primary/40 ring-1 ring-primary/20 hover:shadow-md'
                      : 'border-border hover:shadow-md'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-foreground">{project.name}</h2>
                    {isLocked ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        Bloqueado
                      </span>
                    ) : project.id === activeProjectId ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Activo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {project.pipelineLabel} · {project.completionPercentage}% completado
                  </p>
                  <p className="mt-1 text-xs text-subtle">
                    Actualizado {formatDate(project.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {isLocked ? (
                    canChangeSelection ? (
                      <button
                        type="button"
                        onClick={() => setShowSlotManager(true)}
                        className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                      >
                        Elegir este
                      </button>
                    ) : (
                      <Link
                        href="/#pricing"
                        className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                      >
                        Mejorar plan
                      </Link>
                    )
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleOpen(project)}
                        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Abrir
                      </button>
                      {project.pipelineStep >= 6 && (plan?.limits.executionBoard ?? false) ? (
                        <button
                          type="button"
                          onClick={() => void handleOpenBoard(project)}
                          className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background"
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
                    className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Eliminar ${project.name}`}
                  >
                    {deletingId === project.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-base font-semibold text-foreground">Nuevo proyecto</h3>
        <p className="mt-1 text-sm text-muted">
          Inicia un pipeline independiente sin perder el progreso de tus otros proyectos.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del proyecto (opcional)"
            disabled={!canCreate || creating}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!canCreate || creating}
            className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? 'Creando...' : 'Crear proyecto'}
          </button>
        </div>
        {!canCreate ? (
          <p className="mt-3 text-xs text-muted">
            Has alcanzado el límite de tu plan.{' '}
            <Link href="/#pricing" className="font-medium text-primary underline-offset-2 hover:underline">
              Mejorar plan
            </Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}
