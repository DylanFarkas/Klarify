/**
 * @fileoverview Layout para /agentes/board — Tablero Kanban de ejecución.
 */

import type { Metadata } from 'next';
import { AgentLayout } from '@/components/agents/shared/layout/AgentLayout';

export const metadata: Metadata = {
  title: 'Tablero de ejecución | Klarify',
  description: 'Gestiona el equipo y mueve historias por el tablero Kanban.',
};

export default function BoardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentLayout currentStep={6} agentTitle="Tablero">
      {children}
    </AgentLayout>
  );
}
