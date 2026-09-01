'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import type { SettingsTab } from '@/context/SettingsModalContext';
import { ThemeSettingsPanel } from '@/components/agents/shared/settings/ThemeSettingsPanel';
import { GitHubConnectionPanel } from '@/components/agents/shared/settings/GitHubConnectionPanel';
import { AiProviderConnectionPanel } from '@/components/agents/shared/settings/AiProviderConnectionPanel';
import { GeneralSettingsPanel } from '@/components/agents/shared/settings/GeneralSettingsPanel';
import { TeamSettingsPanel } from '@/components/agents/shared/settings/TeamSettingsPanel';
import { GitHubExportUpgradeGate } from '@/components/agents/github/GitHubExportUpgradeGate';
import { useWorkspace } from '@/hooks/useWorkspace';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  activeTab: SettingsTab;
  onClose: () => void;
  onTabChange: (tab: SettingsTab) => void;
}

const TABS: { id: SettingsTab; label: string; description: string; icon: ReactNode }[] = [
  {
    id: 'appearance',
    label: 'Apariencia',
    description: 'Tema y acento del workspace',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'team',
    label: 'Equipo',
    description: 'Personas de este proyecto para asignar trabajo',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
  {
    id: 'integrations',
    label: 'Integraciones',
    description: 'IA, GitHub y herramientas',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: 'general',
    label: 'Generales',
    description: 'Comportamiento del workspace',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
];

export function WorkspaceSettingsModal({
  isOpen,
  activeTab,
  onClose,
  onTabChange,
}: WorkspaceSettingsModalProps) {
  const { isGithubConnected } = useAuth();
  const { plan } = useWorkspace();
  const githubEnabled = plan?.limits.github ?? false;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !mounted) return null;

  const activeTabMeta = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar configuración"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-settings-title"
        className={[
          'relative z-10 flex w-full max-w-3xl flex-col overflow-hidden',
          'rounded-t-2xl border border-border/60 bg-surface sm:rounded-2xl',
          'h-[min(90vh,700px)] animate-[fadeIn_0.3s_ease-out]',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="workspace-settings-title"
              className="text-[20px] font-semibold tracking-tight text-foreground sm:text-[22px] sm:leading-snug"
            >
              Configuración
            </h2>
            <p className="mt-1 text-[12px] text-muted">Preferencias del workspace y del proyecto activo</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t border-border/60 sm:flex-row">
          <nav
            className={[
              'shrink-0 border-border/60 bg-background',
              'flex gap-0.5 overflow-x-auto border-b p-2',
              'sm:w-44 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:border-b-0 sm:border-r',
            ].join(' ')}
            role="tablist"
            aria-orientation="vertical"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const showBadge = tab.id === 'integrations' && isGithubConnected;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange(tab.id)}
                  className={[
                    'relative flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-left transition-colors',
                    'shrink-0 sm:w-full',
                    isActive
                      ? 'bg-elevated font-medium text-primary'
                      : 'text-muted hover:bg-surface-hover hover:text-foreground',
                  ].join(' ')}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center">{tab.icon}</span>
                  <span className="text-[13px] whitespace-nowrap">{tab.label}</span>
                  {showBadge ? (
                    <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
            <div className="shrink-0 px-5 pt-5 sm:px-6">
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                {activeTabMeta.label}
              </h3>
              <p className="mt-0.5 text-[12px] text-muted">{activeTabMeta.description}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:pb-6">
              {activeTab === 'appearance' && <ThemeSettingsPanel />}

              {activeTab === 'team' && <TeamSettingsPanel />}

              {activeTab === 'integrations' && (
                <div className="flex flex-col gap-6">
                  <AiProviderConnectionPanel />
                  <div className="border-t border-border/60 pt-6">
                    {githubEnabled ? (
                      <GitHubConnectionPanel reposListMaxHeight="max-h-56" />
                    ) : (
                      <GitHubExportUpgradeGate compact />
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'general' && <GeneralSettingsPanel />}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
