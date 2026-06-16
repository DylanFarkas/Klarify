/**
 * @fileoverview AgentLayout — Shell visual del workspace de agentes.
 *
 * Componente server-side que provee la estructura común para todas las
 * vistas de agentes: sidebar con stepper, header con info del agente,
 * y área de contenido principal.
 *
 * Cada agente usa este layout pasando su `currentStep` y `agentTitle`.
 */

import Link from 'next/link';
import { AgentStepper } from './AgentStepper';

interface AgentLayoutProps {
  /** Contenido de la página del agente */
  children: React.ReactNode;
  /** Número del agente activo (1-6), controla el stepper */
  currentStep: number;
  /** Título descriptivo del agente (ej: "Ingesta de Contexto") */
  agentTitle: string;
}

export function AgentLayout({ children, currentStep, agentTitle }: AgentLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#0B0F1A]">
      {/* ── Sidebar (solo desktop) ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-white/10 bg-[#070A12] px-6 py-8">
        {/* Logo */}
        <Link
          href="/"
          className="mb-10 text-xl font-extrabold tracking-tight text-white transition-opacity hover:opacity-80"
        >
          <span className="text-[#005BBF]">K</span>larify
        </Link>

        {/* Stepper de agentes */}
        <AgentStepper currentStep={currentStep} />

        {/* Spacer + branding inferior */}
        <div className="mt-auto pt-8 border-t border-white/10">
          <p className="text-xs text-white/30">
            Klarify v0.1.0 — MVP
          </p>
        </div>
      </aside>

      {/* ── Área principal ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-white/10 px-6 py-4 lg:px-10">
          {/* Logo mobile */}
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight text-white lg:hidden"
          >
            <span className="text-[#005BBF]">K</span>larify
          </Link>

          {/* Separador mobile */}
          <div className="h-6 w-px bg-white/15 lg:hidden" aria-hidden="true" />

          {/* Badge del agente + título */}
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#005BBF] text-sm font-bold text-white">
              {currentStep}
            </span>
            <h2 className="text-base font-semibold text-white lg:text-lg">
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
