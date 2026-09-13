'use client';

import Link from 'next/link';
import { createContext, useContext } from 'react';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import {
  SIDEBAR_EASE,
  sidebarCollapsibleClass,
  sidebarCollapsibleInnerClass,
  sidebarIconSlotClass,
  sidebarLabelClass,
} from './sidebar-styles';

interface WorkspaceSidebarChromeProps {
  brandSubtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

const SidebarRailCollapsedContext = createContext(false);

export function useSidebarRailCollapsed() {
  return useContext(SidebarRailCollapsedContext);
}

function SidebarPanelIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2.25" />
      <path d="M9.25 4.75v14.5" />
      <path
        className={`origin-center transform-fill transition-transform duration-300 ${SIDEBAR_EASE} group-data-[collapsed=true]/sidebar:rotate-180 motion-reduce:transition-none`}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 9.75 5.5 12l2 2.25"
      />
    </svg>
  );
}

/**
 * Sidebar ~244px estilo Circle: brand tile + nombre, contenido fluido, footer sin borde pesado.
 * Colapsado queda un rail de 56px con los iconos centrados; solo se animan el
 * ancho, los bloques plegables y la opacidad de los textos.
 */
export function WorkspaceSidebarChrome({
  brandSubtitle,
  children,
  footer,
}: WorkspaceSidebarChromeProps) {
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();

  return (
    <SidebarRailCollapsedContext.Provider value={collapsed}>
      <aside
        id="workspace-sidebar"
        data-collapsed={collapsed ? 'true' : 'false'}
        className={[
          'group/sidebar relative z-10 hidden h-full shrink-0 flex-col overflow-hidden bg-background lg:flex',
          `border-r border-border/50 transition-[width] duration-380 ${SIDEBAR_EASE} motion-reduce:transition-none`,
          collapsed ? 'w-16' : 'w-61',
        ].join(' ')}
      >
        <div className="flex min-h-0 flex-1 flex-col p-2">
          <div className="mb-3 flex flex-col gap-0.5 px-2 group-data-[collapsed=true]/sidebar:px-0">
            <div
              className={`grid h-8 grid-cols-[minmax(0,1fr)_1.5rem] items-center justify-center gap-x-2 transition-[grid-template-columns,gap] duration-380 ${SIDEBAR_EASE} group-data-[collapsed=true]/sidebar:grid-cols-[0fr_1.5rem] group-data-[collapsed=true]/sidebar:gap-x-0 motion-reduce:transition-none`}
            >
              <Link
                href="/agentes/proyectos"
                title="Klarify"
                className={`${sidebarLabelClass} text-lg font-extrabold tracking-tight text-foreground hover:opacity-80`}
              >
                <span className="text-primary">K</span>larify
              </Link>

              <button
                type="button"
                onClick={toggleCollapsed}
                aria-controls="workspace-sidebar"
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                className={`${sidebarIconSlotClass} cursor-pointer rounded-md text-subtle transition-colors hover:bg-surface-hover hover:text-foreground`}
              >
                <SidebarPanelIcon />
              </button>
            </div>

            {brandSubtitle ? (
              <div className={sidebarCollapsibleClass}>
                <div className={sidebarCollapsibleInnerClass}>
                  <p className="truncate pt-0.5 text-left text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
                    {brandSubtitle}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto scrollbar-none">
            {children}
          </div>
        </div>

        <div className="mt-auto shrink-0 p-2 pt-0">{footer}</div>
      </aside>
    </SidebarRailCollapsedContext.Provider>
  );
}
