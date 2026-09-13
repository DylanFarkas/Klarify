/**
 * @fileoverview AgentLayout — Shell visual del workspace de agentes.
 *
 * Componente server-side que provee la estructura común para todas las
 * vistas de agentes: sidebar (stepper durante el pipeline, navegación
 * de workspace al llegar al dashboard), header con info del agente,
 * y área de contenido principal.
 *
 * Cada agente usa este layout pasando su `currentStep` y `agentTitle`.
 */

import { AgentLayoutShell } from './AgentLayoutShell';

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
    <AgentLayoutShell currentStep={currentStep} agentTitle={agentTitle}>
      {children}
    </AgentLayoutShell>
  );
}
