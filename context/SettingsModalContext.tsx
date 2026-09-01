'use client';

/**
 * Estado de UI del modal de configuración del workspace.
 * Permite abrir una pestaña concreta (p. ej. Equipo) desde cualquier vista.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type SettingsTab = 'appearance' | 'team' | 'integrations' | 'general';

interface SettingsModalContextType {
  isOpen: boolean;
  activeTab: SettingsTab;
  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
  setActiveTab: (tab: SettingsTab) => void;
}

const SettingsModalContext = createContext<SettingsModalContextType | null>(null);

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  const openSettings = useCallback((tab?: SettingsTab) => {
    if (tab) setActiveTab(tab);
    setIsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({ isOpen, activeTab, openSettings, closeSettings, setActiveTab }),
    [isOpen, activeTab, openSettings, closeSettings]
  );

  return <SettingsModalContext.Provider value={value}>{children}</SettingsModalContext.Provider>;
}

export function useSettingsModal(): SettingsModalContextType {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) {
    throw new Error('useSettingsModal debe usarse dentro de SettingsModalProvider');
  }
  return ctx;
}
