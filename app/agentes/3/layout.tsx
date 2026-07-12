/**
 * @fileoverview Layout para la ruta /agentes/3 — Agente 3: Estimación.
 */

import type { Metadata } from 'next';
import { AgentLayout } from '@/components/agents/shared/layout/AgentLayout';

export const metadata: Metadata = {
  title: 'Agente 3 — Estimación | Klarify',
  description:
    'Estima el valor y esfuerzo de las épicas e historias de usuario para definir el roadmap.',
};

export default function Agent3Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentLayout currentStep={3} agentTitle="Estimación">
      {children}
    </AgentLayout>
  );
}