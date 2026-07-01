/**
 * @fileoverview Layout para la ruta /agentes/4 — Agente 4: Priorización.
 */

import type { Metadata } from 'next';
import { AgentLayout } from '@/components/agents/shared/layout/AgentLayout';

export const metadata: Metadata = {
  title: 'Agente 4 — Priorización | Klarify',
  description:
    'Prioriza épicas e historias de usuario según valor y esfuerzo estimado.',
};

export default function Agent4Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentLayout currentStep={4} agentTitle="Priorización">
      {children}
    </AgentLayout>
  );
}
