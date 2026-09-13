'use client';

import { useWorkspace } from '@/hooks/useWorkspace';
import { BoardWorkspace } from '@/components/agents/board/BoardWorkspace';
import { BoardUpgradeGate } from '@/components/agents/board/BoardUpgradeGate';
import { DashboardLoadingState } from '@/components/agents/dashboard/DashboardLoadingState';

export default function BoardPage() {
  const { isLoading, plan } = useWorkspace();

  if (isLoading) {
    return <DashboardLoadingState variant="board" />;
  }

  if (!plan?.limits.executionBoard) {
    return <BoardUpgradeGate />;
  }

  return <BoardWorkspace />;
}
