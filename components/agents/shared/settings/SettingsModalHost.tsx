'use client';

import type { ReactNode } from 'react';
import { SettingsModalProvider, useSettingsModal } from '@/context/SettingsModalContext';
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal';

function SettingsModalRenderer() {
  const { isOpen, activeTab, closeSettings, setActiveTab } = useSettingsModal();

  return (
    <WorkspaceSettingsModal
      isOpen={isOpen}
      activeTab={activeTab}
      onClose={closeSettings}
      onTabChange={setActiveTab}
    />
  );
}

export function SettingsModalHost({ children }: { children: ReactNode }) {
  return (
    <SettingsModalProvider>
      {children}
      <SettingsModalRenderer />
    </SettingsModalProvider>
  );
}
