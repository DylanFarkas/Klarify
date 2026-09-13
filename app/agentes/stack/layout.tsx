/**
 * @fileoverview Layout para /agentes/stack — Stack tecnológico del proyecto.
 */

import type { Metadata } from 'next';
import { AgentLayout } from '@/components/agents/shared/layout/AgentLayout';

export const metadata: Metadata = {
  title: 'Stack | Klarify',
  description: 'Arquitectura y tecnologías recomendadas para tu proyecto.',
};

export default function StackLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentLayout currentStep={6} agentTitle="Stack">
      {children}
    </AgentLayout>
  );
}
