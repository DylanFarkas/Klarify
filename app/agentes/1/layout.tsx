/**
 * @fileoverview Layout para la ruta /agentes/1 — Agente 1: Ingesta de Contexto.
 *
 * Envuelve la página del Agente 1 en el shell visual compartido (AgentLayout)
 * con sidebar, stepper y header. Define la metadata SEO del agente.
 */

import type { Metadata } from 'next';
import { AgentLayout } from '@/components/agents/shared/layout/AgentLayout';

export const metadata: Metadata = {
  title: 'Agente 1 — Ingesta de Contexto | Klarify',
  description:
    'Carga el audio o documentos de tu reunión con el cliente para transcribir y extraer necesidades automáticamente.',
};

export default function Agent1Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentLayout currentStep={1} agentTitle="Ingesta de Contexto">
      {children}
    </AgentLayout>
  );
}
