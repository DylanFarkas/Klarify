/**
 * @fileoverview WorkspaceSettingsContext — Preferencias generales del workspace de agentes.
 *
 * Persiste la configuración en localStorage (tema aparte en AgentThemeContext).
 */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_WORKSPACE_SETTINGS,
  readPersistedWorkspaceSettings,
  STORAGE_KEY_WORKSPACE_SETTINGS,
  type WorkspaceGeneralSettings,
} from '@/lib/constants/workspace-settings';

interface WorkspaceSettingsContextType extends WorkspaceGeneralSettings {
  setShowModelReasoning: (value: boolean) => void;
}

const WorkspaceSettingsContext = createContext<WorkspaceSettingsContextType | null>(null);

function persistSettings(settings: WorkspaceGeneralSettings) {
  try {
    localStorage.setItem(STORAGE_KEY_WORKSPACE_SETTINGS, JSON.stringify(settings));
  } catch {
    // localStorage no disponible
  }
}

export function WorkspaceSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WorkspaceGeneralSettings>(DEFAULT_WORKSPACE_SETTINGS);

  useLayoutEffect(() => {
    setSettings(readPersistedWorkspaceSettings());
  }, []);

  const setShowModelReasoning = useCallback((showModelReasoning: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, showModelReasoning };
      persistSettings(next);
      return next;
    });
  }, []);

  return (
    <WorkspaceSettingsContext.Provider
      value={{
        showModelReasoning: settings.showModelReasoning,
        setShowModelReasoning,
      }}
    >
      {children}
    </WorkspaceSettingsContext.Provider>
  );
}

export function useWorkspaceSettings(): WorkspaceSettingsContextType {
  const ctx = useContext(WorkspaceSettingsContext);
  if (!ctx) {
    throw new Error('useWorkspaceSettings debe usarse dentro de WorkspaceSettingsProvider');
  }
  return ctx;
}
