/**
 * @fileoverview Layout para la ruta /agentes/dashboard — Resumen del workspace.
 */

import type { Metadata } from 'next';
import { AgentLayout } from '@/components/agents/shared/layout/AgentLayout';

export const metadata: Metadata = {
  title: 'Dashboard del workspace | Klarify',
  description:
    'Resumen del proyecto con sprint activo, historial de sprints y métricas generales.',
};

export default function Agent5Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentLayout currentStep={6} agentTitle="Dashboard">
      {children}
    </AgentLayout>
  );
}
