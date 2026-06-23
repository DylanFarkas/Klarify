/**
 * @fileoverview AgentThemeContext — Contexto de temas del workspace de agentes.
 *
 * Provee el tema activo y permite cambiarlo entre presets predeterminados.
 * Persiste la selección en localStorage y sincroniza `data-agent-theme`
 * en el documento para evitar parpadeo al recargar.
 */

'use client';

import { createContext, useContext, useCallback, useState, useEffect, useLayoutEffect, type ReactNode } from 'react';
import {
  type AgentTheme,
  STORAGE_KEY_AGENT_THEME,
  DEFAULT_AGENT_THEME,
  readPersistedAgentTheme,
} from '@/lib/constants/agent-theme';

interface AgentThemeContextType {
  theme: AgentTheme;
  setTheme: (theme: AgentTheme) => void;
}

const AgentThemeContext = createContext<AgentThemeContextType | null>(null);

function applyThemeToDocument(theme: AgentTheme) {
  document.documentElement.setAttribute('data-agent-theme', theme);
}

export function AgentThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AgentTheme>(DEFAULT_AGENT_THEME);

  // Restaura desde localStorage al entrar al workspace (navegación SPA o recarga)
  useLayoutEffect(() => {
    const stored = readPersistedAgentTheme();
    setThemeState(stored);
    applyThemeToDocument(stored);
  }, []);

  // Limpia el atributo al salir del workspace de agentes
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-agent-theme');
    };
  }, []);

  const setTheme = useCallback((next: AgentTheme) => {
    setThemeState(next);
    applyThemeToDocument(next);
    try {
      localStorage.setItem(STORAGE_KEY_AGENT_THEME, next);
    } catch {
      // localStorage no disponible
    }
  }, []);

  return (
    <AgentThemeContext.Provider value={{ theme, setTheme }}>
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
