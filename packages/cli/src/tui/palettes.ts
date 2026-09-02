import {
  accentMeta,
  type AgentTheme,
  type KlarifyAccent,
} from '../core/theme-ids';
import { hexLuminance, mixHex } from './hex';

export type TuiColors = {
  bg: string;
  surface: string;
  surfaceHi: string;
  primary: string;
  primaryHi: string;
  accent: string;
  steel: string;
  /** Texto de máximo contraste (en claro es oscuro). */
  white: string;
  ink: string;
  muted: string;
  faint: string;
  border: string;
  borderHi: string;
  danger: string;
  success: string;
  warn: string;
  panel: string;
  onAccent: string;
};

type Seeds = Omit<TuiColors, 'white' | 'panel' | 'onAccent' | 'steel' | 'primary' | 'primaryHi'> & {
  steel?: string;
  primary?: string;
  primaryHi?: string;
};

function finish(seeds: Seeds): TuiColors {
  const accent = seeds.accent;
  const primary = seeds.primary ?? accent;
  const primaryHi = seeds.primaryHi ?? mixHex(accent, '#ffffff', 0.18);
  const steel = seeds.steel ?? mixHex(seeds.muted, accent, 0.42);
  return {
    ...seeds,
    primary,
    primaryHi,
    steel,
    white: hexLuminance(seeds.bg) > 0.5 ? seeds.ink : '#ffffff',
    panel: seeds.bg,
    onAccent: hexLuminance(accent) > 0.58 ? seeds.bg : '#ffffff',
  };
}

/** Tokens de `app/agent-themes.css`. */
const BASE: Record<AgentTheme, Seeds> = {
  light: {
    bg: '#ffffff',
    surface: '#fafafa',
    surfaceHi: '#ececee',
    accent: '#005bbf',
    primary: '#005bbf',
    primaryHi: '#3d7fd6',
    steel: '#6a89b6',
    ink: '#18181b',
    muted: '#55555a',
    faint: '#a1a1aa',
    border: '#e4e4e7',
    borderHi: '#d4d4d8',
    danger: '#dc2626',
    success: '#16a34a',
    warn: '#ca8a04',
  },
  klarify: {
    bg: '#08080a',
    surface: '#101014',
    surfaceHi: '#16161c',
    accent: '#3ecf8e',
    primary: '#3ecf8e',
    primaryHi: '#35b87d',
    steel: '#6a89b6',
    ink: '#ececef',
    muted: '#8f8f98',
    faint: '#5c5c66',
    border: '#1f1f23',
    borderHi: '#3f3f48',
    danger: '#f87171',
    success: '#3ecf8e',
    warn: '#c9a227',
  },
  'one-dark': {
    bg: '#121212',
    surface: '#1e1e1e',
    surfaceHi: '#282828',
    accent: '#61afef',
    primary: '#61afef',
    primaryHi: '#528bce',
    ink: '#c8c8c8',
    muted: '#8a8a8a',
    faint: '#6e6e6e',
    border: '#2e2e2e',
    borderHi: '#3a3a3a',
    danger: '#e06c75',
    success: '#98c379',
    warn: '#e5c07b',
  },
  catppuccin: {
    bg: '#11111b',
    surface: '#181825',
    surfaceHi: '#1e1e2e',
    accent: '#cba6f7',
    primary: '#cba6f7',
    primaryHi: '#b794e8',
    ink: '#cdd6f4',
    muted: '#a6adc8',
    faint: '#6c7086',
    border: '#313244',
    borderHi: '#45475a',
    danger: '#f38ba8',
    success: '#a6e3a1',
    warn: '#f9e2af',
  },
  solarized: {
    bg: '#00141a',
    surface: '#002b36',
    surfaceHi: '#073642',
    accent: '#2aa198',
    primary: '#2aa198',
    primaryHi: '#238b84',
    ink: '#93a1a1',
    muted: '#586e75',
    faint: '#49656c',
    border: '#073642',
    borderHi: '#586e75',
    danger: '#dc322f',
    success: '#859900',
    warn: '#b58900',
  },
  monokai: {
    bg: '#141511',
    surface: '#1e1f1c',
    surfaceHi: '#272822',
    accent: '#f92672',
    primary: '#f92672',
    primaryHi: '#d91c60',
    ink: '#f8f8f2',
    muted: '#75715e',
    faint: '#5e5b4c',
    border: '#2d2e27',
    borderHi: '#49483e',
    danger: '#f92672',
    success: '#a6e22e',
    warn: '#e6db74',
  },
  nord: {
    bg: '#181c24',
    surface: '#1e222a',
    surfaceHi: '#2e3440',
    accent: '#88c0d0',
    primary: '#88c0d0',
    primaryHi: '#7ab0bf',
    ink: '#eceff4',
    muted: '#d8dee9',
    faint: '#4c566a',
    border: '#2e3440',
    borderHi: '#3b4252',
    danger: '#bf616a',
    success: '#a3be8c',
    warn: '#ebcb8b',
  },
  gruvbox: {
    bg: '#141617',
    surface: '#1d2021',
    surfaceHi: '#282828',
    accent: '#fe8019',
    primary: '#fe8019',
    primaryHi: '#d65d0e',
    ink: '#ebdbb2',
    muted: '#928374',
    faint: '#7c6f64',
    border: '#282828',
    borderHi: '#3c3836',
    danger: '#fb4934',
    success: '#b8bb26',
    warn: '#fabd2f',
  },
};

export function resolveTuiColors(theme: AgentTheme, accent: KlarifyAccent): TuiColors {
  const base = BASE[theme];
  if (theme !== 'klarify') return finish(base);

  const meta = accentMeta(accent);
  const skySteel = accent === 'sky' ? '#6a89b6' : mixHex('#5c5c66', meta.primary, 0.45);
  return finish({
    ...base,
    accent: meta.primary,
    primary: meta.primary,
    primaryHi: meta.hover,
    success: meta.primary,
    steel: skySteel,
  });
}

export function statusColors(colors: TuiColors): Record<string, string> {
  return {
    todo: colors.muted,
    in_progress: colors.primaryHi,
    code_review: colors.warn,
    done: colors.success,
  };
}

export function priorityColors(colors: TuiColors): Record<string, string> {
  return {
    must: colors.danger,
    should: colors.warn,
    could: colors.primaryHi,
    wont: colors.faint,
    critical: colors.danger,
    high: colors.warn,
    medium: colors.primaryHi,
    low: colors.muted,
  };
}
