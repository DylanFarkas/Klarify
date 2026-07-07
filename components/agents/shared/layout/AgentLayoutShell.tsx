'use client';

import Link from 'next/link';
import { AgentStepper } from './AgentStepper';
import { AgentSidebarSettings } from './AgentSidebarSettings';
import { NewSessionButton } from './NewSessionButton';
import { ProjectSwitcher } from './ProjectSwitcher';
import { WorkspaceGridBackground } from './WorkspaceGridBackground';

interface AgentLayoutShellProps {
  children: React.ReactNode;
  currentStep: number;
  agentTitle: string;
}

export function AgentLayoutShell({ children, currentStep, agentTitle }: AgentLayoutShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-border bg-surface px-6 py-8 overflow-y-auto scrollbar-gutter-stable">
        <div className="mb-8">
          <Link
            href="/"
            className="block text-center text-4xl font-extrabold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            <span className="text-primary">K</span>larify
          </Link>
          <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
            Workspace de agentes
          </p>
        </div>

        <AgentStepper currentStep={currentStep} />

        <div className="mt-8">
          <ProjectSwitcher />
        </div>

        <div className="mt-3">
          <AgentSidebarSettings />
        </div>
        
        <div className="mt-3">
          <NewSessionButton />
        </div>

        <div className="mt-auto pt-8 border-t border-border">
          <p className="text-xs text-subtle">Klarify v0.1.0 — MVP</p>
        </div>
      </aside>

      <div className="relative flex flex-1 flex-col min-w-0">
        <WorkspaceGridBackground />

        <div className="relative z-10 border-b border-border bg-surface/90 backdrop-blur-md px-6 py-4 lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link href="/" className="text-lg font-extrabold tracking-tight text-foreground">
                <span className="text-primary">K</span>larify
              </Link>
              <p className="truncate text-xs text-muted">
                Paso {currentStep} - {agentTitle}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
              {currentStep}/6
            </span>
          </div>
          <AgentSidebarSettings className="mt-4 border-t-0 pt-0" />
          <NewSessionButton className="mt-2" />
        </div>

        <main className="relative z-10 flex-1 overflow-y-auto scrollbar-gutter-stable px-6 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
