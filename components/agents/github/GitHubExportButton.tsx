'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { GitHubExportModal } from '@/components/agents/github/GitHubExportModal';
import { GitHubExportUpgradeGate } from '@/components/agents/github/GitHubExportUpgradeGate';

interface GitHubExportButtonProps {
  projectId: string;
  projectName: string;
  canExport: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function GitHubExportButton({
  projectId,
  projectName,
  canExport,
  variant = 'primary',
  className = '',
}: GitHubExportButtonProps) {
  const { plan } = useWorkspace();
  const githubEnabled = plan?.limits.github ?? false;
  const [modalOpen, setModalOpen] = useState(false);

  if (!githubEnabled) {
    if (variant === 'secondary') {
      return (
        <Link
          href="/#pricing"
          className={`rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 ${className}`}
        >
          Disponible en Pro
        </Link>
      );
    }
    return <GitHubExportUpgradeGate />;
  }

  const baseClasses =
    variant === 'primary'
      ? 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
      : 'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        disabled={!canExport}
        className={`${baseClasses} ${className} cursor-pointer`}
        title={
          canExport
            ? 'Exportar backlog a GitHub Projects'
            : 'Completa la planificación de sprints antes de exportar'
        }
      >
        Exportar a GitHub
      </button>

      <GitHubExportModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projectId={projectId}
        projectName={projectName}
        canExport={canExport}
      />
    </>
  );
}
