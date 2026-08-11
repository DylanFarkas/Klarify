/**
 * @fileoverview AgentThemeContext — Contexto de temas del workspace de agentes.
 *
 * Provee el tema activo y permite cambiarlo entre presets predeterminados.
 * Persiste la selección en localStorage y sincroniza `data-agent-theme`
 * (y `data-klarify-accent` cuando aplica) en el documento para evitar parpadeo.
 */

'use client';

import { createContext, useContext, useCallback, useState, useEffect, useLayoutEffect, type ReactNode } from 'react';
import {
  type AgentTheme,
  type KlarifyAccent,
  STORAGE_KEY_AGENT_THEME,
  STORAGE_KEY_KLARIFY_ACCENT,
  DEFAULT_AGENT_THEME,
  DEFAULT_KLARIFY_ACCENT,
  readPersistedAgentTheme,
  readPersistedKlarifyAccent,
} from '@/lib/constants/agent-theme';

interface AgentThemeContextType {
  theme: AgentTheme;
  setTheme: (theme: AgentTheme) => void;
  klarifyAccent: KlarifyAccent;
  setKlarifyAccent: (accent: KlarifyAccent) => void;
}

const AgentThemeContext = createContext<AgentThemeContextType | null>(null);

function applyThemeToDocument(theme: AgentTheme, klarifyAccent: KlarifyAccent) {
  document.documentElement.setAttribute('data-agent-theme', theme);
  document.documentElement.removeAttribute('data-carbon-accent');
  if (theme === 'klarify') {
    document.documentElement.setAttribute('data-klarify-accent', klarifyAccent);
  } else {
    document.documentElement.removeAttribute('data-klarify-accent');
  }
}

export function AgentThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AgentTheme>(DEFAULT_AGENT_THEME);
  const [klarifyAccent, setKlarifyAccentState] = useState<KlarifyAccent>(DEFAULT_KLARIFY_ACCENT);

  // Restaura desde localStorage al entrar al workspace (navegación SPA o recarga)
  useLayoutEffect(() => {
    const storedTheme = readPersistedAgentTheme();
    const storedAccent = readPersistedKlarifyAccent();
    setThemeState(storedTheme);
    setKlarifyAccentState(storedAccent);
    applyThemeToDocument(storedTheme, storedAccent);
    // Migrar ID legacy carbon → klarify en storage
    if (storedTheme === 'klarify') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_AGENT_THEME);
        if (raw === 'carbon') {
          localStorage.setItem(STORAGE_KEY_AGENT_THEME, 'klarify');
        }
      } catch {
        // localStorage no disponible
      }
    }
  }, []);

  // Limpia los atributos al salir del workspace de agentes
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-agent-theme');
      document.documentElement.removeAttribute('data-klarify-accent');
      document.documentElement.removeAttribute('data-carbon-accent');
    };
  }, []);

  const setTheme = useCallback((next: AgentTheme) => {
    setThemeState(next);
    applyThemeToDocument(next, klarifyAccent);
    try {
      localStorage.setItem(STORAGE_KEY_AGENT_THEME, next);
    } catch {
      // localStorage no disponible
    }
  }, [klarifyAccent]);

  const setKlarifyAccent = useCallback((next: KlarifyAccent) => {
    setKlarifyAccentState(next);
    applyThemeToDocument(theme, next);
    try {
      localStorage.setItem(STORAGE_KEY_KLARIFY_ACCENT, next);
    } catch {
      // localStorage no disponible
    }
  }, [theme]);

  return (
    <AgentThemeContext.Provider value={{ theme, setTheme, klarifyAccent, setKlarifyAccent }}>
      <div className="agent-workspace h-dvh min-h-0 overflow-hidden">
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
