/**
 * @fileoverview Layout para /agentes/backlog — Backlog y planificación de sprints.
 */

import type { Metadata } from 'next';
import { AgentLayout } from '@/components/agents/shared/layout/AgentLayout';

export const metadata: Metadata = {
  title: 'Backlog y sprints | Klarify',
  description: 'Organiza el backlog, crea sprints y asigna historias de usuario.',
};

export default function BacklogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentLayout currentStep={6} agentTitle="Backlog">
      {children}
    </AgentLayout>
  );
}
