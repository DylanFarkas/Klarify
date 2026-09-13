/**
 * @fileoverview Página Stack — arquitectura y tecnologías del proyecto.
 */

'use client';

import { StackContent } from '@/components/agents/stack/StackContent';
import { DashboardLoadingState } from '@/components/agents/dashboard/DashboardLoadingState';
import { useWorkspace } from '@/hooks/useWorkspace';

export default function StackPage() {
  const { workspace, isLoading, saveStack, clearStack } = useWorkspace();

  if (isLoading || !workspace) {
    return <DashboardLoadingState variant="stack" />;
  }

  const pipelineReady = Boolean(workspace.pipeline.agent6Input);

  return (
    <StackContent
      workspace={workspace}
      pipelineReady={pipelineReady}
      onSaveStack={saveStack}
      onClearStack={clearStack}
    />
  );
}
