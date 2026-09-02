/** IDs y etiquetas alineados con `lib/constants/agent-theme.ts` de la web. */

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

/** TUI oscura de producto; la web arranca en claro. */
export const DEFAULT_TUI_THEME: AgentTheme = 'klarify';

/** Cielo ≈ el azul con el que nació la TUI. */
export const DEFAULT_TUI_ACCENT: KlarifyAccent = 'sky';

export const AGENT_THEMES: {
  id: AgentTheme;
  label: string;
  preview: { bg: string; accent: string };
}[] = [
  { id: 'light', label: 'Claro', preview: { bg: '#ffffff', accent: '#005BBF' } },
  { id: 'klarify', label: 'Klarify', preview: { bg: '#08080A', accent: '#3ecf8e' } },
  { id: 'one-dark', label: 'One Dark Pro', preview: { bg: '#121212', accent: '#61afef' } },
  { id: 'catppuccin', label: 'Catppuccin', preview: { bg: '#11111b', accent: '#cba6f7' } },
  { id: 'solarized', label: 'Solarized', preview: { bg: '#00141a', accent: '#2aa198' } },
  { id: 'monokai', label: 'Monokai', preview: { bg: '#141511', accent: '#f92672' } },
  { id: 'nord', label: 'Nord', preview: { bg: '#181c24', accent: '#88c0d0' } },
  { id: 'gruvbox', label: 'Gruvbox', preview: { bg: '#141617', accent: '#fe8019' } },
];

export const KLARIFY_ACCENTS: {
  id: KlarifyAccent;
  label: string;
  primary: string;
  hover: string;
}[] = [
  { id: 'green', label: 'Verde', primary: '#3ecf8e', hover: '#35b87d' },
  { id: 'sky', label: 'Cielo', primary: '#4d9fff', hover: '#3b8aef' },
  { id: 'cyan', label: 'Cian', primary: '#22d3ee', hover: '#06b6d4' },
  { id: 'violet', label: 'Violeta', primary: '#a78bfa', hover: '#8b5cf6' },
  { id: 'amber', label: 'Ámbar', primary: '#fbbf24', hover: '#f59e0b' },
  { id: 'coral', label: 'Coral', primary: '#fb7185', hover: '#f43f5e' },
  { id: 'red', label: 'Rojo', primary: '#ef4444', hover: '#dc2626' },
  { id: 'cafe', label: 'Café', primary: '#d2a679', hover: '#b8956c' },
];

const VALID_THEMES = new Set<AgentTheme>(AGENT_THEMES.map((item) => item.id));
const VALID_ACCENTS = new Set<KlarifyAccent>(KLARIFY_ACCENTS.map((item) => item.id));

const THEME_ALIASES: Record<string, AgentTheme> = {
  carbon: 'klarify',
};

export function isValidAgentTheme(value: string | null | undefined): value is AgentTheme {
  return value != null && VALID_THEMES.has(value as AgentTheme);
}

export function isValidKlarifyAccent(value: string | null | undefined): value is KlarifyAccent {
  return value != null && VALID_ACCENTS.has(value as KlarifyAccent);
}

export function resolveAgentTheme(value: string | null | undefined): AgentTheme {
  if (isValidAgentTheme(value)) return value;
  if (value && THEME_ALIASES[value]) return THEME_ALIASES[value]!;
  return DEFAULT_TUI_THEME;
}

export function resolveKlarifyAccent(value: string | null | undefined): KlarifyAccent {
  return isValidKlarifyAccent(value) ? value : DEFAULT_TUI_ACCENT;
}

export function themeLabel(id: AgentTheme): string {
  return AGENT_THEMES.find((item) => item.id === id)?.label ?? id;
}

export function accentMeta(id: KlarifyAccent) {
  return KLARIFY_ACCENTS.find((item) => item.id === id) ?? KLARIFY_ACCENTS[0]!;
}
