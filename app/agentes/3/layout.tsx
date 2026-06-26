/**
 * @fileoverview Layout para la ruta /agentes/3 — Agente 3: Priorización.
 */

import type { Metadata } from 'next';
import { AgentLayout } from '@/components/agents/shared/AgentLayout';

export const metadata: Metadata = {
  title: 'Agente 3 — Priorización | Klarify',
  description:
    'Ordena épicas e historias de usuario por valor y esfuerzo para definir el roadmap.',
};

export default function Agent3Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentLayout currentStep={3} agentTitle="Priorización">
      {children}
    </AgentLayout>
  );
}