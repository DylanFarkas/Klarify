export type AgentTheme = 'light' | 'dark' | 'carbon' | 'ocean' | 'forest' | 'rose';

export type CarbonAccent = 'green' | 'sky' | 'cyan' | 'violet' | 'amber' | 'coral' | 'red' | 'cafe';

/** Clave de localStorage para persistir el tema del workspace */
export const STORAGE_KEY_AGENT_THEME = 'klarify-agent-theme';

/** Clave de localStorage para el acento de Carbón */
export const STORAGE_KEY_CARBON_ACCENT = 'klarify-carbon-accent';

/** Tema por defecto cuando no hay preferencia guardada */
export const DEFAULT_AGENT_THEME: AgentTheme = 'light';

/** Acento por defecto de Carbón (verde característico) */
export const DEFAULT_CARBON_ACCENT: CarbonAccent = 'green';

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

/** Acentos para combinar con la base oscura de Carbón */
export const CARBON_ACCENTS: {
  id: CarbonAccent;
  label: string;
  primary: string;
  hover: string;
  /** RGB sin alpha para tints CSS (ej. "62 207 142") */
  rgb: string;
}[] = [
  { id: 'green', label: 'Verde', primary: '#3ecf8e', hover: '#32b87d', rgb: '62 207 142' },
  { id: 'sky', label: 'Cielo', primary: '#4d9fff', hover: '#3b8aef', rgb: '77 159 255' },
  { id: 'cyan', label: 'Cian', primary: '#22d3ee', hover: '#06b6d4', rgb: '34 211 238' },
  { id: 'violet', label: 'Violeta', primary: '#a78bfa', hover: '#8b5cf6', rgb: '167 139 250' },
  { id: 'amber', label: 'Ámbar', primary: '#fbbf24', hover: '#f59e0b', rgb: '251 191 36' },
  { id: 'coral', label: 'Coral', primary: '#fb7185', hover: '#f43f5e', rgb: '251 113 133' },
  { id: 'red', label: 'Rojo', primary: '#ef4444', hover: '#dc2626', rgb: '239 68 68' },
  { id: 'cafe', label: 'Café', primary: '#d2a679', hover: '#b8956c', rgb: '210 166 121' },
];

const VALID_THEMES = new Set<AgentTheme>(AGENT_THEMES.map((t) => t.id));
const VALID_CARBON_ACCENTS = new Set<CarbonAccent>(CARBON_ACCENTS.map((a) => a.id));

export function isValidAgentTheme(value: string | null | undefined): value is AgentTheme {
  return value != null && VALID_THEMES.has(value as AgentTheme);
}

export function isValidCarbonAccent(value: string | null | undefined): value is CarbonAccent {
  return value != null && VALID_CARBON_ACCENTS.has(value as CarbonAccent);
}

export function resolveAgentTheme(value: string | null | undefined): AgentTheme {
  return isValidAgentTheme(value) ? value : DEFAULT_AGENT_THEME;
}

export function resolveCarbonAccent(value: string | null | undefined): CarbonAccent {
  return isValidCarbonAccent(value) ? value : DEFAULT_CARBON_ACCENT;
}

export function getCarbonAccentMeta(id: CarbonAccent) {
  return CARBON_ACCENTS.find((a) => a.id === id) ?? CARBON_ACCENTS[0];
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

/** Lee el acento de Carbón persistido en localStorage (solo cliente) */
export function readPersistedCarbonAccent(): CarbonAccent {
  if (typeof window === 'undefined') return DEFAULT_CARBON_ACCENT;
  try {
    return resolveCarbonAccent(localStorage.getItem(STORAGE_KEY_CARBON_ACCENT));
  } catch {
    return DEFAULT_CARBON_ACCENT;
  }
}

/** Script inline para aplicar el tema (y acento de Carbón) antes de la hidratación (anti-FOUC) */
export function getAgentThemeBootstrapScript(): string {
  const valid = AGENT_THEMES.map((t) => t.id);
  const validAccents = CARBON_ACCENTS.map((a) => a.id);
  return `(function(){try{var t=localStorage.getItem('${STORAGE_KEY_AGENT_THEME}');var valid=${JSON.stringify(valid)};var theme=t&&valid.indexOf(t)!==-1?t:'${DEFAULT_AGENT_THEME}';document.documentElement.setAttribute('data-agent-theme',theme);if(theme==='carbon'){var a=localStorage.getItem('${STORAGE_KEY_CARBON_ACCENT}');var validA=${JSON.stringify(validAccents)};var accent=a&&validA.indexOf(a)!==-1?a:'${DEFAULT_CARBON_ACCENT}';document.documentElement.setAttribute('data-carbon-accent',accent);}else{document.documentElement.removeAttribute('data-carbon-accent');}}catch(e){document.documentElement.setAttribute('data-agent-theme','${DEFAULT_AGENT_THEME}');document.documentElement.removeAttribute('data-carbon-accent');}})();`;
}
