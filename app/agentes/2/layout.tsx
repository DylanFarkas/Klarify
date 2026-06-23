/**
 * @fileoverview Layout para la ruta /agentes/2 — Agente 2: Análisis de Necesidades.
 */

import type { Metadata } from 'next';
import { AgentLayout } from '@/components/agents/shared/AgentLayout';

export const metadata: Metadata = {
  title: 'Agente 2 — Análisis de Necesidades | Klarify',
  description:
    'Analiza los deseos del cliente extraídos por el Agente 1 para generar historias de usuario.',
};

export default function Agent2Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentLayout currentStep={2} agentTitle="Análisis de Necesidades">
      {children}
    </AgentLayout>
  );
}
