'use client';

import Link from 'next/link';
import { AgentStepper } from './AgentStepper';
import { AgentSidebarSettings } from './AgentSidebarSettings';

interface AgentLayoutShellProps {
  children: React.ReactNode;
  currentStep: number;
  agentTitle: string;
}

export function AgentLayoutShell({ children, currentStep, agentTitle }: AgentLayoutShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0F1A] dark:text-white">
      {/* ── Sidebar (solo desktop) ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-slate-200 bg-white px-6 py-8 dark:border-white/10 dark:bg-[#070A12]">
        {/* Logo */}
        <Link
          href="/"
          className="mb-10 text-xl font-extrabold tracking-tight text-slate-900 transition-opacity hover:opacity-80 dark:text-white"
        >
          <span className="text-[#005BBF]">K</span>larify
        </Link>

        {/* Stepper de agentes */}
        <AgentStepper currentStep={currentStep} />

        {/* Configuración */}
        <AgentSidebarSettings />

        {/* Spacer + branding inferior */}
        <div className="mt-auto pt-8 border-t border-slate-200 dark:border-white/10">
          <p className="text-xs text-slate-400 dark:text-white/30">
            Klarify v0.1.0 — MVP
          </p>
        </div>
      </aside>

      {/* ── Área principal ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-slate-200 px-6 py-4 lg:px-10 dark:border-white/10">
          {/* Logo mobile */}
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight text-slate-900 lg:hidden dark:text-white"
          >
            <span className="text-[#005BBF]">K</span>larify
          </Link>

          {/* Separador mobile */}
          <div className="h-6 w-px bg-slate-200 lg:hidden dark:bg-white/15" aria-hidden="true" />

          {/* Badge del agente + título */}
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#005BBF] text-sm font-bold text-white">
              {currentStep}
            </span>
            <h2 className="text-base font-semibold text-slate-900 lg:text-lg dark:text-white">
              {agentTitle}
            </h2>
          </div>
        </header>

        {/* Contenido del agente */}
        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}