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
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface px-6 py-8 scrollbar-gutter-stable lg:flex">
        <div className="mb-8">
          <Link
            href="/agentes/proyectos"
            className="block text-center text-4xl font-extrabold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            <span className="text-primary">K</span>larify
          </Link>
          <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
            Tu workspace
          </p>
        </div>

        <WorkspaceHomeNav />

        <div className="mt-4">
          <ProjectSwitcher />
        </div>

        <div className="mt-auto pt-8">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-linear-to-b from-background/70 to-surface-muted/40 shadow-sm">
            <WorkspacePlanSummary />
            <WorkspaceAccountSection />
          </div>
          <AgentSidebarSettings className="mt-3 border-t-0 pt-0" />
          <p className="mt-5 text-center text-[11px] text-subtle">Klarify v0.1.0 — MVP</p>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <WorkspaceGridBackground />

        <div className="relative z-10 border-b border-border bg-surface/90 px-6 py-4 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link href="/agentes/proyectos" className="text-lg font-extrabold tracking-tight text-foreground">
                <span className="text-primary">K</span>larify
              </Link>
              <p className="truncate text-xs text-muted">Tu workspace</p>
            </div>
          </div>
          <div className="mt-3">
            <ProjectSwitcher />
          </div>
          <AgentSidebarSettings className="mt-3 border-t border-border pt-3" />
        </div>

        <main className="relative z-10 flex-1 overflow-y-auto scrollbar-gutter-stable px-6 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
