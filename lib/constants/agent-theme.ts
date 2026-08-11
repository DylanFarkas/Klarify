export type AgentTheme =
  | 'light'
  | 'klarify'
  | 'one-dark'
  | 'catppuccin'
  | 'solarized'
  | 'monokai'
  | 'nord'
  | 'gruvbox';

export type KlarifyAccent = 'green' | 'sky' | 'cyan' | 'violet' | 'amber' | 'coral' | 'red' | 'cafe';

/** Clave de localStorage para persistir el tema del workspace */
export const STORAGE_KEY_AGENT_THEME = 'klarify-agent-theme';

/** Clave de localStorage para el acento de Klarify (legacy: carbon) */
export const STORAGE_KEY_KLARIFY_ACCENT = 'klarify-carbon-accent';

/** Tema por defecto cuando no hay preferencia guardada */
export const DEFAULT_AGENT_THEME: AgentTheme = 'light';

/** Acento por defecto de Klarify (verde característico) */
export const DEFAULT_KLARIFY_ACCENT: KlarifyAccent = 'green';

/** Registro de presets disponibles con metadatos para la UI */
export const AGENT_THEMES: {
  id: AgentTheme;
  label: string;
  preview: { bg: string; accent: string };
}[] = [
  { id: 'light', label: 'Claro', preview: { bg: '#f8fafc', accent: '#005BBF' } },
  { id: 'klarify', label: 'Klarify', preview: { bg: '#0f0f10', accent: '#3ecf8e' } },
  { id: 'one-dark', label: 'One Dark Pro', preview: { bg: '#121212', accent: '#61afef' } },
  { id: 'catppuccin', label: 'Catppuccin', preview: { bg: '#11111b', accent: '#cba6f7' } },
  { id: 'solarized', label: 'Solarized', preview: { bg: '#002b36', accent: '#2aa198' } },
  { id: 'monokai', label: 'Monokai', preview: { bg: '#1e1f1c', accent: '#f92672' } },
  { id: 'nord', label: 'Nord', preview: { bg: '#1e222a', accent: '#88c0d0' } },
  { id: 'gruvbox', label: 'Gruvbox', preview: { bg: '#1d2021', accent: '#fe8019' } },
];

/** Acentos para combinar con la base oscura de Klarify */
export const KLARIFY_ACCENTS: {
  id: KlarifyAccent;
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
const VALID_KLARIFY_ACCENTS = new Set<KlarifyAccent>(KLARIFY_ACCENTS.map((a) => a.id));

/** IDs legacy → Klarify (Carbón renombrado) */
const THEME_ALIASES: Record<string, AgentTheme> = {
  carbon: 'klarify',
};

export function isValidAgentTheme(value: string | null | undefined): value is AgentTheme {
  return value != null && VALID_THEMES.has(value as AgentTheme);
}

export function isValidKlarifyAccent(value: string | null | undefined): value is KlarifyAccent {
  return value != null && VALID_KLARIFY_ACCENTS.has(value as KlarifyAccent);
}

export function resolveAgentTheme(value: string | null | undefined): AgentTheme {
  if (value == null) return DEFAULT_AGENT_THEME;
  if (isValidAgentTheme(value)) return value;
  const aliased = THEME_ALIASES[value];
  if (aliased) return aliased;
  return DEFAULT_AGENT_THEME;
}

export function resolveKlarifyAccent(value: string | null | undefined): KlarifyAccent {
  return isValidKlarifyAccent(value) ? value : DEFAULT_KLARIFY_ACCENT;
}

export function getKlarifyAccentMeta(id: KlarifyAccent) {
  return KLARIFY_ACCENTS.find((a) => a.id === id) ?? KLARIFY_ACCENTS[0];
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

/** Lee el acento de Klarify persistido en localStorage (solo cliente) */
export function readPersistedKlarifyAccent(): KlarifyAccent {
  if (typeof window === 'undefined') return DEFAULT_KLARIFY_ACCENT;
  try {
    return resolveKlarifyAccent(localStorage.getItem(STORAGE_KEY_KLARIFY_ACCENT));
  } catch {
    return DEFAULT_KLARIFY_ACCENT;
  }
}

/** Script inline para aplicar el tema (y acento de Klarify) antes de la hidratación (anti-FOUC) */
export function getAgentThemeBootstrapScript(): string {
  const valid = AGENT_THEMES.map((t) => t.id);
  const validAccents = KLARIFY_ACCENTS.map((a) => a.id);
  return `(function(){try{var t=localStorage.getItem('${STORAGE_KEY_AGENT_THEME}');var valid=${JSON.stringify(valid)};var theme;if(t==='carbon'){theme='klarify';}else if(t&&valid.indexOf(t)!==-1){theme=t;}else{theme='${DEFAULT_AGENT_THEME}';}document.documentElement.setAttribute('data-agent-theme',theme);if(theme==='klarify'){var a=localStorage.getItem('${STORAGE_KEY_KLARIFY_ACCENT}');var validA=${JSON.stringify(validAccents)};var accent=a&&validA.indexOf(a)!==-1?a:'${DEFAULT_KLARIFY_ACCENT}';document.documentElement.setAttribute('data-klarify-accent',accent);}else{document.documentElement.removeAttribute('data-klarify-accent');}document.documentElement.removeAttribute('data-carbon-accent');}catch(e){document.documentElement.setAttribute('data-agent-theme','${DEFAULT_AGENT_THEME}');document.documentElement.removeAttribute('data-klarify-accent');document.documentElement.removeAttribute('data-carbon-accent');}})();`;
}
