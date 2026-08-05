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

const TABS: { id: SettingsTab; label: string; icon: ReactNode }[] = [
  {
    id: 'appearance',
    label: 'Apariencia',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'integrations',
    label: 'Integraciones',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: 'general',
    label: 'Configuraciones generales',
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

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar configuración"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-settings-title"
        className={[
          'relative z-10 flex w-full max-w-lg flex-col overflow-hidden',
          'rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl',
          'max-h-[min(90vh,640px)] animate-[slideUp_0.25s_ease-out] sm:animate-[fadeIn_0.2s_ease-out]',
        ].join(' ')}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 id="workspace-settings-title" className="text-base font-bold text-foreground">
                  Configuración
                </h2>
                <p className="text-xs text-subtle">Personaliza tu workspace</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-elevated p-1" role="tablist">
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
                    'relative flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-semibold transition-all sm:gap-2 sm:px-3 sm:text-xs',
                    isActive
                      ? 'bg-surface text-foreground shadow-sm ring-1 ring-border/60'
                      : 'text-subtle hover:text-foreground',
                  ].join(' ')}
                >
                  {tab.icon}
                  {tab.label}
                  {showBadge && (
                    <span className="absolute right-2 top-3 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {activeTab === 'appearance' && <ThemeSettingsPanel />}

          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Integraciones</h3>
                <p className="mt-1 text-xs text-subtle">
                  Conecta un proveedor de IA y herramientas externas para tu backlog.
                </p>
              </div>
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

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
