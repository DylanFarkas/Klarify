'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { ThemeSettingsPanel } from '@/components/agents/shared/settings/ThemeSettingsPanel';
import { GitHubConnectionPanel } from '@/components/agents/shared/settings/GitHubConnectionPanel';
import { AiProviderConnectionPanel } from '@/components/agents/shared/settings/AiProviderConnectionPanel';
import { GeneralSettingsPanel } from '@/components/agents/shared/settings/GeneralSettingsPanel';
import { GitHubExportUpgradeGate } from '@/components/agents/github/GitHubExportUpgradeGate';
import { useWorkspace } from '@/hooks/useWorkspace';

type SettingsTab = 'appearance' | 'integrations' | 'general';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS: { id: SettingsTab; label: string; description: string; icon: ReactNode }[] = [
  {
    id: 'appearance',
    label: 'Apariencia',
    description: 'Tema y acento del workspace',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'integrations',
    label: 'Integraciones',
    description: 'IA, GitHub y herramientas',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: 'general',
    label: 'Generales',
    description: 'Comportamiento del workspace',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
];

export function WorkspaceSettingsModal({ isOpen, onClose }: WorkspaceSettingsModalProps) {
  const { isGithubConnected } = useAuth();
  const { plan } = useWorkspace();
  const githubEnabled = plan?.limits.github ?? false;
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
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
    <div className="fixed inset-0 z-100 flex items-end justify-center p-0 sm:items-center sm:p-4">
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
          'rounded-t-xl border border-border bg-surface sm:rounded-xl',
          'h-[min(90vh,640px)] animate-[slideUp_0.25s_ease-out] sm:animate-[fadeIn_0.2s_ease-out]',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id="workspace-settings-title"
              className="text-[15px] font-semibold tracking-tight text-foreground"
            >
              Configuración
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">Personaliza tu workspace</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: sidebar | content */}
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Nav lateral (horizontal en móvil) */}
          <nav
            className={[
              'shrink-0 border-border',
              'flex gap-1 overflow-x-auto border-b p-2',
              'sm:w-52 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:border-b-0 sm:border-r sm:p-3',
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
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'relative flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
                    'shrink-0 sm:w-full',
                    isActive
                      ? 'bg-surface-hover text-foreground'
                      : 'text-subtle hover:bg-surface-muted hover:text-foreground',
                  ].join(' ')}
                >
                  <span className="shrink-0 opacity-80">{tab.icon}</span>
                  <span className="text-[13px] font-medium whitespace-nowrap">{tab.label}</span>
                  {showBadge && (
                    <span
                      className="ml-auto hidden h-1.5 w-1.5 shrink-0 rounded-full bg-success sm:block"
                      aria-hidden="true"
                    />
                  )}
                  {showBadge && (
                    <span
                      className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-success sm:hidden"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Panel de contenido */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 px-5 pt-5 pb-1 sm:px-6 sm:pt-6">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                {activeTabMeta.label}
              </h3>
              <p className="mt-0.5 text-[12px] text-muted">{activeTabMeta.description}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:pb-6">
              {activeTab === 'appearance' && <ThemeSettingsPanel />}

              {activeTab === 'integrations' && (
                <div className="space-y-4">
                  <AiProviderConnectionPanel />
                  {githubEnabled ? (
                    <GitHubConnectionPanel reposListMaxHeight="max-h-56" />
                  ) : (
                    <GitHubExportUpgradeGate />
                  )}
                </div>
              )}

              {activeTab === 'general' && <GeneralSettingsPanel />}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-3 sm:px-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
