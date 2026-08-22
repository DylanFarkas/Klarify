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

export function WorkspaceHomeShell({ children }: WorkspaceHomeShellProps) {
  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <WorkspaceSidebarChrome
        brandSubtitle="Tu workspace"
        footer={
          <>
            <WorkspacePlanSummary />
            <div className="mt-2.5">
              <AgentSidebarSettings />
            </div>
            <div className="mt-2.5">
              <WorkspaceAccountSection />
            </div>
          </>
        }
      >
        <WorkspaceHomeNav />

        <div className="mt-1">
          <ProjectSwitcher />
        </div>
      </WorkspaceSidebarChrome>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <WorkspaceGridBackground />

        <div className="relative z-10 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between gap-3">
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
          </div>
          <div className="mt-2.5">
            <ProjectSwitcher />
          </div>
          <AgentSidebarSettings className="mt-2.5" />
        </div>

        <main className="relative z-10 flex-1 overflow-y-auto scrollbar-gutter-stable px-6 py-8 lg:px-12 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
