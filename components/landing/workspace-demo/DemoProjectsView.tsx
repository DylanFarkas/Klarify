"use client";

import { DEMO_ACTIVE_PROJECT, DEMO_PROJECTS } from "./demo-data";

interface DemoProjectsViewProps {
  onOpenProject: () => void;
}

export function DemoProjectsView({ onOpenProject }: DemoProjectsViewProps) {
  const avgCompletion = Math.round(
    DEMO_PROJECTS.reduce((sum, p) => sum + p.completionPercentage, 0) / DEMO_PROJECTS.length
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Proyectos</h1>
        <p className="text-sm leading-relaxed text-muted">
          Cada proyecto conserva su propio pipeline. Abre uno para continuar o crea uno nuevo.
        </p>
        <p className="mt-1.5 text-[13px] text-subtle">
          {DEMO_PROJECTS.length} total · {DEMO_PROJECTS.length} activos · {avgCompletion}% progreso medio
        </p>
      </header>

      <section className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs text-subtle">Continuar</p>
          <h2 className="mt-0.5 truncate text-[15px] font-semibold text-foreground">
            {DEMO_ACTIVE_PROJECT.name}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {DEMO_ACTIVE_PROJECT.pipelineLabel} · {DEMO_ACTIVE_PROJECT.completionPercentage}%
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-border sm:block">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${DEMO_ACTIVE_PROJECT.completionPercentage}%` }}
            />
          </div>
          <button
            type="button"
            onClick={onOpenProject}
            className="cursor-pointer rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Abrir
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-foreground">GitHub</p>
          <p className="mt-0.5 text-[13px] text-muted">Conectado como @alexrivera</p>
        </div>
        <button
          type="button"
          tabIndex={-1}
          className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
        >
          Exportar a GitHub
        </button>
      </section>

      <section>
        <div className="mb-2.5 flex items-center justify-between px-1">
          <p className="text-xs font-medium text-subtle">Todos los proyectos</p>
          <p className="text-xs text-subtle">
            {DEMO_PROJECTS.length}/10
          </p>
        </div>
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {DEMO_PROJECTS.map((project, index) => {
            const isActive = project.id === DEMO_ACTIVE_PROJECT.id;
            return (
              <li
                key={project.id}
                className={[
                  "group flex flex-col gap-3 px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between",
                  index > 0 ? "border-t border-border" : "",
                  isActive ? "bg-surface-hover/40" : "hover:bg-surface-hover/60",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={onOpenProject}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-medium text-foreground">{project.name}</h2>
                    {isActive ? (
                      <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                        Activo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {project.pipelineLabel} · {project.completionPercentage}%
                    <span className="text-subtle"> · {project.relativeAge}</span>
                  </p>
                </button>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenProject}
                    className="cursor-pointer rounded-lg bg-foreground px-3.5 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium text-foreground"
                  >
                    Gestionar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-border/80 bg-surface/70 p-5">
        <h3 className="text-[15px] font-semibold text-foreground">Nuevo proyecto</h3>
        <p className="mt-1 text-sm text-muted">
          Pipeline independiente sin perder el progreso de los demás.
        </p>
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-start">
          <input
            type="text"
            placeholder="Nombre del proyecto"
            disabled
            className="w-full flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-subtle disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            disabled
            className="shrink-0 rounded-lg bg-foreground px-4.5 py-2.5 text-sm font-medium text-background opacity-40"
          >
            Crear
          </button>
        </div>
      </section>
    </div>
  );
}
