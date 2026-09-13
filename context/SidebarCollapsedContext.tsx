'use client';

/**
 * Estado del rail colapsado del sidebar.
 * Vive en el layout de /agentes para no reiniciarse al cambiar de ruta.
 */

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  readPersistedSidebarCollapsed,
  STORAGE_KEY_SIDEBAR_COLLAPSED,
} from '@/lib/constants/workspace-settings';

interface SidebarCollapsedContextType {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const SidebarCollapsedContext = createContext<SidebarCollapsedContextType | null>(null);

function persistCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, String(collapsed));
  } catch {
    // localStorage no disponible
  }
}

export function SidebarCollapsedProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(() => {
    setCollapsed(readPersistedSidebarCollapsed());
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      persistCollapsed(next);
      return next;
    });
  }, []);

  return (
    <SidebarCollapsedContext.Provider value={{ collapsed, toggleCollapsed }}>
      {children}
    </SidebarCollapsedContext.Provider>
  );
}

export function useSidebarCollapsed(): SidebarCollapsedContextType {
  const ctx = useContext(SidebarCollapsedContext);
  if (!ctx) {
    throw new Error('useSidebarCollapsed debe usarse dentro de SidebarCollapsedProvider');
  }
  return ctx;
}
