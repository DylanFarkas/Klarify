/**
 * @fileoverview AgentThemeContext — Contexto de temas del workspace de agentes.
 *
 * Provee el tema activo y permite cambiarlo entre presets predeterminados.
 * Persiste la selección en localStorage y sincroniza `data-agent-theme`
 * (y `data-carbon-accent` cuando aplica) en el documento para evitar parpadeo.
 */

'use client';

import { createContext, useContext, useCallback, useState, useEffect, useLayoutEffect, type ReactNode } from 'react';
import {
  type AgentTheme,
  type CarbonAccent,
  STORAGE_KEY_AGENT_THEME,
  STORAGE_KEY_CARBON_ACCENT,
  DEFAULT_AGENT_THEME,
  DEFAULT_CARBON_ACCENT,
  readPersistedAgentTheme,
  readPersistedCarbonAccent,
} from '@/lib/constants/agent-theme';

interface AgentThemeContextType {
  theme: AgentTheme;
  setTheme: (theme: AgentTheme) => void;
  carbonAccent: CarbonAccent;
  setCarbonAccent: (accent: CarbonAccent) => void;
}

const AgentThemeContext = createContext<AgentThemeContextType | null>(null);

function applyThemeToDocument(theme: AgentTheme, carbonAccent: CarbonAccent) {
  document.documentElement.setAttribute('data-agent-theme', theme);
  if (theme === 'carbon') {
    document.documentElement.setAttribute('data-carbon-accent', carbonAccent);
  } else {
    document.documentElement.removeAttribute('data-carbon-accent');
  }
}

export function AgentThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AgentTheme>(DEFAULT_AGENT_THEME);
  const [carbonAccent, setCarbonAccentState] = useState<CarbonAccent>(DEFAULT_CARBON_ACCENT);

  // Restaura desde localStorage al entrar al workspace (navegación SPA o recarga)
  useLayoutEffect(() => {
    const storedTheme = readPersistedAgentTheme();
    const storedAccent = readPersistedCarbonAccent();
    setThemeState(storedTheme);
    setCarbonAccentState(storedAccent);
    applyThemeToDocument(storedTheme, storedAccent);
  }, []);

  // Limpia los atributos al salir del workspace de agentes
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-agent-theme');
      document.documentElement.removeAttribute('data-carbon-accent');
    };
  }, []);

  const setTheme = useCallback((next: AgentTheme) => {
    setThemeState(next);
    applyThemeToDocument(next, carbonAccent);
    try {
      localStorage.setItem(STORAGE_KEY_AGENT_THEME, next);
    } catch {
      // localStorage no disponible
    }
  }, [carbonAccent]);

  const setCarbonAccent = useCallback((next: CarbonAccent) => {
    setCarbonAccentState(next);
    applyThemeToDocument(theme, next);
    try {
      localStorage.setItem(STORAGE_KEY_CARBON_ACCENT, next);
    } catch {
      // localStorage no disponible
    }
  }, [theme]);

  return (
    <AgentThemeContext.Provider value={{ theme, setTheme, carbonAccent, setCarbonAccent }}>
      <div className="agent-workspace min-h-screen">
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
