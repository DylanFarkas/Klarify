'use client';

import { useWorkspace } from '@/hooks/useWorkspace';
import { BoardWorkspace } from '@/components/agents/board/BoardWorkspace';
import { BoardUpgradeGate } from '@/components/agents/board/BoardUpgradeGate';

export default function BoardPage() {
  const { isLoading, plan } = useWorkspace();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted">Cargando tablero…</p>
      </div>
    );
  }

  if (!plan?.limits.executionBoard) {
    return <BoardUpgradeGate />;
  }

  return <BoardWorkspace />;
}
