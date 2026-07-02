export type AgentTheme = 'light' | 'dark' | 'carbon' | 'ocean' | 'forest' | 'rose';

/** Clave de localStorage para persistir el tema del workspace */
export const STORAGE_KEY_AGENT_THEME = 'klarify-agent-theme';

/** Tema por defecto cuando no hay preferencia guardada */
export const DEFAULT_AGENT_THEME: AgentTheme = 'light';

/** Registro de presets disponibles con metadatos para la UI */
export const AGENT_THEMES: {
  id: AgentTheme;
  label: string;
  preview: { bg: string; accent: string };
}[] = [
  { id: 'light', label: 'Claro', preview: { bg: '#f8fafc', accent: '#005BBF' } },
  { id: 'dark', label: 'Oscuro', preview: { bg: '#0B0F1A', accent: '#4d9fff' } },
  { id: 'carbon', label: 'Carbón', preview: { bg: '#1c1c1c', accent: '#3ecf8e' } },
  { id: 'ocean', label: 'Océano', preview: { bg: '#0a1628', accent: '#22d3ee' } },
  { id: 'forest', label: 'Bosque', preview: { bg: '#0a1a12', accent: '#34d399' } },
  { id: 'rose', label: 'Rosa', preview: { bg: '#1a1014', accent: '#f472b6' } },
];

const VALID_THEMES = new Set<AgentTheme>(AGENT_THEMES.map((t) => t.id));

export function isValidAgentTheme(value: string | null | undefined): value is AgentTheme {
  return value != null && VALID_THEMES.has(value as AgentTheme);
}

export function resolveAgentTheme(value: string | null | undefined): AgentTheme {
  return isValidAgentTheme(value) ? value : DEFAULT_AGENT_THEME;
}

/** Lee el tema persistido en localStorage (solo cliente) */
export function readPersistedAgentTheme(): AgentTheme {
  if (typeof window === 'undefined') return DEFAULT_AGENT_THEME;
  try {
    return resolveAgentTheme(localStorage.getItem(STORAGE_KEY_AGENT_THEME));
  } catch {
    return DEFAULT_AGENT_THEME;
  }
}

/** Script inline para aplicar el tema antes de la hidratación (anti-FOUC) */
export function getAgentThemeBootstrapScript(): string {
  const valid = AGENT_THEMES.map((t) => t.id);
  return `(function(){try{var t=localStorage.getItem('${STORAGE_KEY_AGENT_THEME}');var valid=${JSON.stringify(valid)};if(t&&valid.indexOf(t)!==-1){document.documentElement.setAttribute('data-agent-theme',t);}else{document.documentElement.setAttribute('data-agent-theme','${DEFAULT_AGENT_THEME}');}}catch(e){document.documentElement.setAttribute('data-agent-theme','${DEFAULT_AGENT_THEME}');}})();`;
}