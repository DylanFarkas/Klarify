"use client";

import { DEMO_ACTIVE_PROJECT, DEMO_BOARD_COLUMNS, DEMO_STORIES } from "./demo-data";

export function DemoBoardView() {
  const visibleCount = DEMO_STORIES.length;
  const doneCount = DEMO_STORIES.filter((s) => s.column === "done").length;
  const progressPct = Math.round((doneCount / visibleCount) * 100);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div>
        <button
          type="button"
          tabIndex={-1}
          className="text-[12px] text-muted transition-colors hover:text-foreground"
        >
          ← Volver al dashboard
        </button>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Tablero Kanban
            </h1>
            <p className="mt-1 text-[12px] tabular-nums text-subtle">
              {visibleCount} historias visibles · {progressPct}% completadas
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-28">
              <div className="mb-1 flex items-center justify-between text-[11px] text-subtle">
                <span>Progreso</span>
                <span className="tabular-nums">{progressPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.max(progressPct, 2)}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              tabIndex={-1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              Equipo (0/25)
              <svg className="h-3 w-3 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-56">
          <span className="sr-only">Buscar ítems</span>
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
            placeholder="Buscar ítems…"
            disabled
            className="w-full rounded-lg border border-border bg-surface py-1.5 pr-3 pl-8 text-[12px] text-foreground outline-none placeholder:text-subtle disabled:opacity-70"
          />
        </label>
        {["Todo el backlog", "Todas las épicas", "Todos los tipos", "Todos los responsables"].map(
          (label) => (
            <button
              key={label}
              type="button"
              tabIndex={-1}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted"
            >
              {label}
              <svg className="h-3 w-3 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          )
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {DEMO_BOARD_COLUMNS.map((column) => {
          const cards = DEMO_STORIES.filter((s) => s.column === column.id);
          return (
            <div
              key={column.id}
              className="flex min-h-80 w-70 shrink-0 flex-col rounded-xl border border-border bg-surface"
            >
              <header className="border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${column.dotClass}`} aria-hidden />
                    <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                      {column.label}
                    </h3>
                  </div>
                  <span className="tabular-nums text-[11px] text-subtle">{cards.length}</span>
                </div>
                <p className="mt-0.5 pl-3.5 text-[11px] text-subtle">{column.effort}</p>
              </header>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                {cards.map((story) => (
                  <div
                    key={story.id}
                    className="rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-surface-hover/40"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-medium text-subtle">{story.id}</span>
                      <span className="inline-flex items-center rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Historia
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] font-medium leading-snug text-foreground">
                      {story.title}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">{story.epic}</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="rounded-md border border-border bg-surface-muted/40 px-1.5 py-0.5 text-[10px] tabular-nums text-muted">
                        {story.effort}
                      </span>
                      <span className="text-[11px] font-medium text-foreground">{story.priority}</span>
                      <span
                        className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-border text-[9px] text-subtle"
                        title="Sin asignar"
                      >
                        ?
                      </span>
                    </div>
                  </div>
                ))}
                {cards.length === 0 ? (
                  <p className="px-1 py-6 text-center text-[11px] text-subtle">Sin ítems</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-subtle">Proyecto · {DEMO_ACTIVE_PROJECT.name}</p>
    </div>
  );
}
