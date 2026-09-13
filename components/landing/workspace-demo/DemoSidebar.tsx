"use client";

import type { DemoView } from "./demo-data";
import { DEMO_ACTIVE_PROJECT, DEMO_USER } from "./demo-data";

interface DemoSidebarProps {
  activeView: DemoView;
  onNavigate: (view: DemoView) => void;
}

const ICON = {
  projects: (
    <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM4.875 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z"
      />
    </svg>
  ),
  guide: (
    <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  ),
  dashboard: (
    <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  ),
  backlog: (
    <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75v-.008zm0 5.25h.007v.008H3.75v-.008z"
      />
    </svg>
  ),
  stack: (
    <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
      />
    </svg>
  ),
  board: (
    <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 4.5v15m6-15v15M4.5 9.75h15M4.5 14.25h15"
      />
    </svg>
  ),
  settings: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a6.759 6.759 0 010 .255c-.008.378.137.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  exit: (
    <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
      />
    </svg>
  ),
} as const;

function navBtnClass(isActive: boolean): string {
  return [
    "grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
    isActive
      ? "bg-elevated text-foreground"
      : "text-muted hover:bg-surface-hover hover:text-foreground",
  ].join(" ");
}

const WORKSPACE_NAV = [
  {
    view: "backlog" as const,
    label: "Dashboard",
    description: "Sprint activo, historial y métricas del proyecto.",
    icon: ICON.dashboard,
    match: null as DemoView | null,
  },
  {
    view: "backlog" as const,
    label: "Backlog",
    description: "Historias, épicas y planificación de sprints.",
    icon: ICON.backlog,
    match: "backlog" as DemoView,
  },
  {
    view: "stack" as const,
    label: "Stack",
    description: "Arquitectura y tecnologías del proyecto.",
    icon: ICON.stack,
    match: "stack" as DemoView,
  },
  {
    view: "board" as const,
    label: "Tablero",
    description: "Kanban de ejecución y equipo del sprint.",
    icon: ICON.board,
    match: "board" as DemoView,
  },
];

export function DemoSidebar({ activeView, onNavigate }: DemoSidebarProps) {
  const isHome = activeView === "projects";
  const brandSubtitle = isHome ? "Tu workspace" : "Workspace de agentes";

  return (
    <aside className="relative z-10 my-3 ml-3 hidden w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-border-strong bg-surface lg:flex">
      <div className="flex min-h-0 flex-1 flex-col px-3.5 pt-5">
        <div className="mb-5">
          <button
            type="button"
            onClick={() => onNavigate("projects")}
            className="block w-full text-center text-3xl font-extrabold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            <span className="text-primary">K</span>larify
          </button>
          <p className="mt-1.5 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
            {brandSubtitle}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isHome ? (
            <nav className="flex flex-col gap-0.5" aria-label="Navegación del workspace">
              <button type="button" className={navBtnClass(true)} aria-current="page">
                <span className="text-primary">{ICON.projects}</span>
                <span className="truncate text-sm font-medium">Proyectos</span>
              </button>
              <button type="button" className={navBtnClass(false)} tabIndex={-1}>
                {ICON.guide}
                <span className="truncate text-sm">Guía de uso</span>
              </button>

              <div className="mb-1.5 mt-5 flex items-center justify-between px-2.5">
                <p className="text-xs font-medium text-subtle">Proyecto activo</p>
              </div>
              <button type="button" onClick={() => onNavigate("backlog")} className={navBtnClass(false)}>
                <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                <span className="min-w-0 truncate text-sm">Continuar</span>
              </button>
              <button type="button" onClick={() => onNavigate("backlog")} className={navBtnClass(false)}>
                {ICON.dashboard}
                <span className="truncate text-sm">Dashboard</span>
              </button>
              <button type="button" onClick={() => onNavigate("board")} className={navBtnClass(false)}>
                {ICON.board}
                <span className="truncate text-sm">Tablero</span>
              </button>
              <div className="mt-2 rounded-lg border border-border bg-surface-muted/40 px-2.5 py-2">
                <p className="truncate text-sm font-medium text-foreground">{DEMO_ACTIVE_PROJECT.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {DEMO_ACTIVE_PROJECT.pipelineLabel} · {DEMO_ACTIVE_PROJECT.completionPercentage}%
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${DEMO_ACTIVE_PROJECT.completionPercentage}%` }}
                  />
                </div>
              </div>
            </nav>
          ) : (
            <nav className="flex flex-col gap-0.5" aria-label="Vistas del proyecto">
              <p className="mb-2 px-2.5 text-xs font-medium text-subtle">Workspace</p>
              {WORKSPACE_NAV.map((item) => {
                const isActive = item.match !== null && activeView === item.match;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onNavigate(item.view)}
                    className={navBtnClass(isActive)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className={isActive ? "text-primary" : "text-current"}>{item.icon}</span>
                    <span className={["truncate text-sm leading-5", isActive ? "font-medium" : ""].join(" ")}>
                      {item.label}
                    </span>
                    {isActive ? (
                      <span className="col-start-2 text-xs leading-snug text-subtle">{item.description}</span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          )}

          <div className="mt-5 px-1">
            <p className="mb-1.5 px-1.5 text-xs font-medium text-subtle">Cambiar proyecto</p>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground">
              <span className="truncate">{DEMO_ACTIVE_PROJECT.name}</span>
              <svg className="h-3.5 w-3.5 shrink-0 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto shrink-0 border-t border-border px-3.5 py-3.5">
        {isHome ? (
          <div className="rounded-lg bg-surface-muted/60 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-foreground">Plan Pro</p>
              <span className="inline-flex items-center gap-1 text-xs text-subtle">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                Activo
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-subtle">
              <span>5/10 activos</span>
              <span className="tabular-nums">5/10</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full w-1/2 rounded-full bg-primary/70" />
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-border px-2.5 py-1.5 text-center text-[11px] text-subtle">
            Sin modelos disponibles
          </p>
        )}

        <button
          type="button"
          className="mt-2.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted"
          tabIndex={-1}
        >
          {ICON.settings}
          Configuración
        </button>

        {!isHome ? (
          <button
            type="button"
            onClick={() => onNavigate("projects")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            {ICON.exit}
            <span className="flex-1 text-left">Salir del workspace</span>
          </button>
        ) : null}

        <div className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated text-[11px] font-semibold text-foreground">
            {DEMO_USER.initials}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted">
            {DEMO_USER.name}
          </span>
          {!isHome ? (
            <span className="truncate text-[11px] text-subtle">Guía de uso</span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
