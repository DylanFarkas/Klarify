'use client';

import Link from 'next/link';
import { AgentStepper } from './AgentStepper';
import { AgentSidebarSettings } from './AgentSidebarSettings';
import { NewSessionButton } from './NewSessionButton';
import { WorkspaceGridBackground } from './WorkspaceGridBackground';

interface AgentLayoutShellProps {
  children: React.ReactNode;
  currentStep: number;
  agentTitle: string;
}

export function AgentLayoutShell({ children, currentStep, agentTitle }: AgentLayoutShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ── Sidebar (solo desktop) ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-border bg-surface px-6 py-8 overflow-y-auto">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link
            href="/"
            className="text-5xl font-extrabold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            <span className="text-primary">K</span>larify
          </Link>
        </div>

        {/* Stepper de agentes */}
        <AgentStepper currentStep={currentStep} />

        {/* Configuración */}
        <AgentSidebarSettings />

        {/* Nueva sesión */}
        <div className="mt-2">
          <NewSessionButton />
        </div>

        {/* Spacer + branding inferior */}
        <div className="mt-auto pt-8 border-t border-border">
          <p className="text-xs text-subtle">
            Klarify v0.1.0 — MVP
          </p>
        </div>
      </aside>

      {/* ── Área principal ──────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col min-w-0">
        <WorkspaceGridBackground />

        {/* Configuración + nueva sesión (móvil/tablet) */}
        <div className="relative z-10 border-b border-border bg-surface px-6 py-4 lg:hidden">
          <AgentSidebarSettings className="mt-0 border-t-0 pt-0" />
          <NewSessionButton className="mt-2" />
        </div>

        {/* Contenido del agente */}
        <main className="relative z-10 flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
