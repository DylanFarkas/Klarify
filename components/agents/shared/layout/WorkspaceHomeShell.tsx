'use client';

import Link from 'next/link';
import { AgentSidebarSettings } from './AgentSidebarSettings';
import { ProjectSwitcher } from './ProjectSwitcher';
import { WorkspaceAccountSection } from './WorkspaceAccountSection';
import { WorkspaceGridBackground } from './WorkspaceGridBackground';
import { WorkspaceHomeNav } from './WorkspaceHomeNav';
import { WorkspacePlanSummary } from './WorkspacePlanSummary';
import { WorkspaceSidebarChrome } from './WorkspaceSidebarChrome';

interface WorkspaceHomeShellProps {
  children: React.ReactNode;
}

/**
 * Shell del hub de proyectos: sidebar izquierda + contenido a ancho completo.
 */
export function WorkspaceHomeShell({ children }: WorkspaceHomeShellProps) {
  return (
    <div className="relative flex h-full min-h-0 bg-background text-foreground">
      <WorkspaceGridBackground />

      <WorkspaceSidebarChrome
        brandSubtitle="Tu workspace"
        footer={
          <div className="flex flex-col gap-0.5">
            <WorkspacePlanSummary />
            <AgentSidebarSettings />
            <WorkspaceAccountSection />
          </div>
        }
      >
        <WorkspaceHomeNav />
        <ProjectSwitcher />
      </WorkspaceSidebarChrome>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <div className="shrink-0 border-b border-border px-3 py-2 lg:hidden">
          <div className="min-w-0">
            <Link
              href="/agentes/proyectos"
              className="text-lg font-extrabold tracking-tight text-foreground"
            >
              <span className="text-primary">K</span>larify
            </Link>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
              Tu workspace
            </p>
          </div>
          <div className="mt-2">
            <ProjectSwitcher />
          </div>
          <AgentSidebarSettings className="mt-1" />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto scrollbar-gutter-stable">
          {children}
        </main>
      </div>
    </div>
  );
}
