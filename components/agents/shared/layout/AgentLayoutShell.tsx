'use client';

import Link from 'next/link';
import { AgentStepper } from './AgentStepper';
import { AgentSidebarSettings } from './AgentSidebarSettings';
import { NewSessionButton } from './NewSessionButton';
import { ProjectSwitcher } from './ProjectSwitcher';
import { WorkspaceGridBackground } from './WorkspaceGridBackground';
import { WorkspaceSidebarChrome } from './WorkspaceSidebarChrome';
import { WorkspaceSidebarNav } from './WorkspaceSidebarNav';
import {
  SIDEBAR_ICON_CLASS,
  sidebarIconSlotClass,
  sidebarLabelClass,
  sidebarNavItemClass,
} from './sidebar-styles';

interface AgentLayoutShellProps {
  children: React.ReactNode;
  currentStep: number;
  agentTitle: string;
}

/**
 * Shell del workspace: sidebar izquierda + área de contenido a ancho completo.
 */
export function AgentLayoutShell({ children, currentStep, agentTitle }: AgentLayoutShellProps) {
  return (
    <div className="relative flex h-full min-h-0 bg-background text-foreground">
      <WorkspaceGridBackground />

      <WorkspaceSidebarChrome
        footer={
          <div className="flex flex-col gap-0.5">
            <AgentSidebarSettings />
            <NewSessionButton />
            <Link
              href="/manual"
              title="Guía de uso"
              className={sidebarNavItemClass(false)}
            >
              <span className={sidebarIconSlotClass}>
                <svg className={SIDEBAR_ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </span>
              <span className={sidebarLabelClass}>Guía de uso</span>
            </Link>
          </div>
        }
      >
        {currentStep >= 6 ? <WorkspaceSidebarNav /> : <AgentStepper currentStep={currentStep} />}

        <ProjectSwitcher />
      </WorkspaceSidebarChrome>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <div className="shrink-0 border-b border-border px-3 py-2 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                href="/agentes/proyectos"
                className="text-lg font-extrabold tracking-tight text-foreground"
              >
                <span className="text-primary">K</span>larify
              </Link>
              <p className="truncate text-[12px] text-muted">
                {currentStep >= 6 ? agentTitle : `Paso ${currentStep} · ${agentTitle}`}
              </p>
            </div>
            {currentStep >= 6 ? null : (
              <span className="shrink-0 rounded-md border border-border bg-surface-muted px-2 py-1 text-[11px] font-medium tabular-nums text-muted">
                {currentStep}/6
              </span>
            )}
          </div>
          <AgentSidebarSettings className="mt-2" />
          <NewSessionButton className="mt-0.5" />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto scrollbar-gutter-stable">
          {children}
        </main>
      </div>
    </div>
  );
}
