'use client';

import Link from 'next/link';
import { AgentSidebarSettings } from './AgentSidebarSettings';
import { ProjectSwitcher } from './ProjectSwitcher';
import { WorkspaceAccountSection } from './WorkspaceAccountSection';
import { WorkspaceGridBackground } from './WorkspaceGridBackground';
import { WorkspaceHomeNav } from './WorkspaceHomeNav';
import { WorkspacePlanSummary } from './WorkspacePlanSummary';

interface WorkspaceHomeShellProps {
  children: React.ReactNode;
}

export function WorkspaceHomeShell({ children }: WorkspaceHomeShellProps) {
  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex min-h-0 flex-1 flex-col px-3.5 pt-5">
          <div className="mb-5">
            <Link
              href="/agentes/proyectos"
              className="block text-center text-3xl font-extrabold tracking-tight text-foreground transition-opacity hover:opacity-80"
            >
              <span className="text-primary">K</span>larify
            </Link>
            <p className="mt-1.5 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
              Tu workspace
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-gutter-stable">
            <WorkspaceHomeNav />

            <div className="mt-1">
              <ProjectSwitcher />
            </div>
          </div>
        </div>

        <div className="mt-auto shrink-0 border-t border-border px-3.5 py-3.5">
          <WorkspacePlanSummary />
          <div className="mt-2.5">
            <AgentSidebarSettings />
          </div>
          <div className="mt-2.5">
            <WorkspaceAccountSection />
          </div>
        </div>
      </aside>

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
