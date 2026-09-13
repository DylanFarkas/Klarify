import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { peekAppearance, saveConfig } from '../core/config';
import type { AgentTheme, KlarifyAccent } from '../core/theme-ids';
import { type TuiColors, priorityColors, resolveTuiColors, statusColors } from './palettes';

type ThemeContextValue = {
  theme: AgentTheme;
  accent: KlarifyAccent;
  colors: TuiColors;
  statusColor: Record<string, string>;
  priorityColor: Record<string, string>;
  setTheme: (theme: AgentTheme) => void;
  setAccent: (accent: KlarifyAccent) => void;
  persistAppearance: (theme: AgentTheme, accent: KlarifyAccent) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = peekAppearance();
  const [theme, setTheme] = useState<AgentTheme>(initial.theme);
  const [accent, setAccent] = useState<KlarifyAccent>(initial.klarifyAccent);

  const colors = useMemo(() => resolveTuiColors(theme, accent), [theme, accent]);
  const statusColor = useMemo(() => statusColors(colors), [colors]);
  const priorityColor = useMemo(() => priorityColors(colors), [colors]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      accent,
      colors,
      statusColor,
      priorityColor,
      setTheme,
      setAccent,
      persistAppearance: async (nextTheme, nextAccent) => {
        setTheme(nextTheme);
        setAccent(nextAccent);
        await saveConfig({ theme: nextTheme, klarifyAccent: nextAccent });
      },
    }),
    [theme, accent, colors, statusColor, priorityColor],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme requiere ThemeProvider');
  }
  return value;
}
