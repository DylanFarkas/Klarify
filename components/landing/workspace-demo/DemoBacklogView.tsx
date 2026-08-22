"use client";

import { DEMO_ACTIVE_PROJECT, DEMO_BACKLOG_META, DEMO_STORIES } from "./demo-data";

function ChevronIcon() {
  return (
    <svg className="h-3 w-3 shrink-0 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function DragHandle() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-subtle" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
      <circle cx="5" cy="4" r="1.1" />
      <circle cx="11" cy="4" r="1.1" />
      <circle cx="5" cy="8" r="1.1" />
      <circle cx="11" cy="8" r="1.1" />
      <circle cx="5" cy="12" r="1.1" />
      <circle cx="11" cy="12" r="1.1" />
    </svg>
  );
}

export function DemoBacklogView() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          Backlog y sprints
        </h1>
        <p className="text-sm text-muted">{DEMO_ACTIVE_PROJECT.name}</p>
        <p className="text-[12px] tabular-nums text-subtle">
          {DEMO_BACKLOG_META.sprintCount} sprint · {DEMO_BACKLOG_META.backlogCount} en backlog ·{" "}
          {DEMO_BACKLOG_META.storyCount} HU totales
        </p>
      </header>

      <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 md:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
              Backlog y sprints
            </h2>
            <p className="mt-1 text-[12px] text-muted">
              Crea sprints, arrastra HU desde el backlog y edítalas en cualquier momento.
              {" · "}
              <span className="tabular-nums text-subtle">
                {DEMO_BACKLOG_META.sprintCount} sprint · {DEMO_BACKLOG_META.backlogCount} en backlog
              </span>
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <label className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
              <span className="sr-only">Buscar historias</span>
              <svg
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-subtle"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m1.6-5.4a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                placeholder="Buscar HU…"
                disabled
                className="w-full rounded-lg border border-border bg-background py-1.5 pr-3 pl-8 text-[12px] text-foreground outline-none placeholder:text-subtle disabled:opacity-70"
              />
            </label>
            <button
              type="button"
              tabIndex={-1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted"
            >
              Épicas
              <span className="tabular-nums text-subtle">{DEMO_BACKLOG_META.epicCount}</span>
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background"
            >
              <span aria-hidden>+</span>
              Nuevo Item
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-180 border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-[10px] font-medium uppercase tracking-wide text-subtle">
                <th className="w-24 px-3 py-3 md:px-4">ID</th>
                <th className="min-w-50 px-3 py-3">HU</th>
                <th className="hidden w-40 px-3 py-3 md:table-cell">Épica</th>
                <th className="w-16 px-3 py-3">Tiempo</th>
                <th className="w-24 px-3 py-3">Prioridad</th>
                <th className="w-24 px-3 py-3">Estado</th>
                <th className="w-12 px-3 py-3">Asig.</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border bg-surface-muted/30">
                <td colSpan={7} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Backlog</p>
                      <p className="text-xs text-muted">
                        Suelta historias aquí o arrástralas a un sprint
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-foreground">
                      {DEMO_BACKLOG_META.backlogCount} HU · {DEMO_BACKLOG_META.effortTotal}
                    </span>
                  </div>
                </td>
              </tr>

              {DEMO_STORIES.map((story) => (
                <tr
                  key={story.id}
                  className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-hover/40"
                >
                  <td className="px-3 py-3 md:px-4">
                    <p className="text-[12px] font-medium tabular-nums text-foreground">{story.id}</p>
                    <span className="mt-0.5 inline-flex items-center rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Historia
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-2">
                      <DragHandle />
                      <p className="text-[13px] font-medium leading-snug text-foreground">
                        {story.title}
                      </p>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 text-[12px] text-muted md:table-cell">
                    <span className="line-clamp-1">{story.epic}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-md border border-border bg-surface-muted/40 px-1.5 py-0.5 text-[11px] tabular-nums text-muted">
                      {story.effort}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 text-[12px] text-foreground">
                      {story.priority}
                      <ChevronIcon />
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 text-[12px] text-foreground">
                      {story.status}
                      <ChevronIcon />
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border text-[10px] text-subtle"
                      title="Sin asignar"
                    >
                      ?
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
