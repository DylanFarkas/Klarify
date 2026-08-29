'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { getProjectEntryPath } from '@/lib/utils/project-progress';
import {
  SIDEBAR_ICON_CLASS,
  sidebarCollapsibleClass,
  sidebarCollapsibleInnerClass,
  sidebarGroupLabelClass,
  sidebarIconSlotClass,
  sidebarLabelClass,
  sidebarNavItemClass,
} from './sidebar-styles';

const NAV_ITEMS = [
  {
    href: '/agentes/proyectos',
    label: 'Proyectos',
    icon: (
      <svg className={SIDEBAR_ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM4.875 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z"
        />
      </svg>
    ),
  },
  {
    href: '/manual',
    label: 'Guía de uso',
    icon: (
      <svg className={SIDEBAR_ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
  },
] as const;

export function WorkspaceHomeNav() {
  const pathname = usePathname();
  const { projects, activeProjectId, plan } = useWorkspace();

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId && p.status === 'active'),
    [projects, activeProjectId]
  );

  const continueHref = activeProject ? getProjectEntryPath(activeProject) : null;
  const showDashboard =
    activeProject &&
    (activeProject.pipelineStep >= 6 ||
      activeProject.lastAgent === 'dashboard' ||
      activeProject.completionPercentage >= 100);

  const showBoard = showDashboard && (plan?.limits.executionBoard ?? false);

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Navegación del workspace">
      <p className={sidebarGroupLabelClass}>Workspace</p>

      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={sidebarNavItemClass(isActive)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={sidebarIconSlotClass}>{item.icon}</span>
            <span className={sidebarLabelClass}>{item.label}</span>
          </Link>
        );
      })}

      {activeProject ? (
        <>
          <p className={`${sidebarGroupLabelClass} mt-2`}>Proyecto activo</p>

          {continueHref ? (
            <Link href={continueHref} title="Continuar" className={sidebarNavItemClass(false)}>
              <span className={sidebarIconSlotClass}>
                <svg className={SIDEBAR_ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              </span>
              <span className={sidebarLabelClass}>Continuar</span>
            </Link>
          ) : null}

          {showDashboard ? (
            <Link
              href="/agentes/dashboard"
              title="Dashboard"
              className={sidebarNavItemClass(pathname === '/agentes/dashboard')}
              aria-current={pathname === '/agentes/dashboard' ? 'page' : undefined}
            >
              <span className={sidebarIconSlotClass}>
                <svg className={SIDEBAR_ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
              </span>
              <span className={sidebarLabelClass}>Dashboard</span>
            </Link>
          ) : null}

          {showBoard ? (
            <Link
              href="/agentes/board"
              title="Tablero"
              className={sidebarNavItemClass(pathname === '/agentes/board')}
              aria-current={pathname === '/agentes/board' ? 'page' : undefined}
            >
              <span className={sidebarIconSlotClass}>
                <svg className={SIDEBAR_ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 4.5v15m6-15v15M4.5 9.75h15M4.5 14.25h15"
                  />
                </svg>
              </span>
              <span className={sidebarLabelClass}>Tablero</span>
            </Link>
          ) : null}

          <div className={`mt-1 ${sidebarCollapsibleClass}`}>
            <div className={sidebarCollapsibleInnerClass}>
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-medium text-foreground">{activeProject.name}</p>
                <p className="mt-0.5 text-xs text-subtle">
                  {activeProject.pipelineLabel} · {activeProject.completionPercentage}%
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${activeProject.completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </nav>
  );
}
