'use client';

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from 'react';
import {
  type AgentTheme,
  STORAGE_KEY_AGENT_THEME,
  DEFAULT_AGENT_THEME,
} from '@/lib/constants/agent-theme';

interface AgentThemeContextType {
  theme: AgentTheme;
  setTheme: (theme: AgentTheme) => void;
  toggleTheme: () => void;
}

const AgentThemeContext = createContext<AgentThemeContextType | null>(null);

function readStoredTheme(): AgentTheme {
  if (typeof window === 'undefined') return DEFAULT_AGENT_THEME;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_AGENT_THEME);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage no disponible
  }
  return DEFAULT_AGENT_THEME;
}

export function AgentThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AgentTheme>(DEFAULT_AGENT_THEME);

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  const setTheme = useCallback((next: AgentTheme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY_AGENT_THEME, next);
    } catch {
      // localStorage no disponible
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <AgentThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <div
        className={
          theme === 'dark'
            ? 'agent-workspace dark min-h-screen'
            : 'agent-workspace light min-h-screen'
        }
      >
        {children}
      </div>
    </AgentThemeContext.Provider>
  );
}

export function useAgentTheme(): AgentThemeContextType {
  const ctx = useContext(AgentThemeContext);
  if (!ctx) {
    throw new Error('useAgentTheme debe usarse dentro de AgentThemeProvider');
  }
  return ctx;
}