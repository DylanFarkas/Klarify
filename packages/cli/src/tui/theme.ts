/** Paleta Klarify: azul #005BBF sobre carbón, no el verde-ácido de terminal genérico. */
export const colors = {
  primary: '#005BBF',
  primaryHi: '#4C8DDB',
  ink: '#E6E8EE',
  muted: '#8B91A0',
  faint: '#5C6370',
  surface: '#12141A',
  panel: '#0C0C0E',
  border: '#2A3140',
  danger: '#E85D4C',
  success: '#3D9A6A',
  warn: '#C9A227',
} as const;

export const statusColor: Record<string, string> = {
  todo: colors.muted,
  in_progress: colors.primaryHi,
  code_review: colors.warn,
  done: colors.success,
};

export const priorityColor: Record<string, string> = {
  must: colors.danger,
  should: colors.warn,
  could: colors.primaryHi,
  wont: colors.faint,
  critical: colors.danger,
  high: colors.warn,
  medium: colors.primaryHi,
  low: colors.muted,
};
