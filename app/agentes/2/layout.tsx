/**
 * @fileoverview Layout para la ruta /agentes/2 — Agente 2: Análisis de Necesidades.
 */

import type { Metadata } from 'next';
import { AgentLayout } from '@/components/agents/shared/layout/AgentLayout';

export const metadata: Metadata = {
  title: 'Agente 2 — Backlog Inicial | Klarify',
  description:
    'Transforma deseos aprobados en épicas e historias de usuario estructuradas.',
};

export default function Agent2Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentLayout currentStep={2} agentTitle="Backlog Inicial">
      {children}
    </AgentLayout>
  );
}
