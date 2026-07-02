/**
 * @fileoverview Layout para la ruta /agentes/5 — Agente 5: Planificación de Sprints.
 */

import type { Metadata } from 'next';
import { AgentLayout } from '@/components/agents/shared/layout/AgentLayout';

export const metadata: Metadata = {
  title: 'Agente 5 — Planificación de Sprints | Klarify',
  description:
    'Organiza historias priorizadas en sprints con objetivos, capacidad, velocidad y cronograma.',
};

export default function Agent5Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentLayout currentStep={5} agentTitle="Planificación de Sprints">
      {children}
    </AgentLayout>
  );
}
