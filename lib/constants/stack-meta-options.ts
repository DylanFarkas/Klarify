/**
 * @fileoverview Opciones predefinidas para tipo de producto y patrón de arquitectura del stack.
 */

export const STACK_META_CUSTOM_VALUE = '__custom__';

export const STACK_PRODUCT_KIND_OPTIONS = [
  { value: 'SaaS web', label: 'SaaS web' },
  { value: 'SaaS B2B', label: 'SaaS B2B' },
  { value: 'Marketplace', label: 'Marketplace' },
  { value: 'E-commerce', label: 'E-commerce' },
  { value: 'App mobile', label: 'App mobile' },
  { value: 'Landing / marketing', label: 'Landing / marketing' },
  { value: 'API / backend', label: 'API / backend' },
  { value: 'Plataforma interna', label: 'Plataforma interna' },
  { value: STACK_META_CUSTOM_VALUE, label: 'Otro (personalizado)' },
] as const;

export const STACK_ARCHITECTURE_OPTIONS = [
  { value: 'Monolito modular', label: 'Monolito modular' },
  { value: 'Monolito full-stack', label: 'Monolito full-stack' },
  { value: 'Microservicios', label: 'Microservicios' },
  { value: 'JAMstack', label: 'JAMstack' },
  { value: 'Serverless', label: 'Serverless' },
  { value: 'Cliente mobile + API backend', label: 'Cliente mobile + API backend' },
  { value: 'SPA + API REST', label: 'SPA + API REST' },
  { value: STACK_META_CUSTOM_VALUE, label: 'Otro (personalizado)' },
] as const;

export function resolveStackMetaSelectValue(
  value: string,
  options: ReadonlyArray<{ value: string; label: string }>
): { mode: string; custom: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { mode: '', custom: '' };
  }

  const preset = options.find((option) => option.value === trimmed);
  if (preset && preset.value !== STACK_META_CUSTOM_VALUE) {
    return { mode: preset.value, custom: '' };
  }

  return { mode: STACK_META_CUSTOM_VALUE, custom: trimmed };
}

export function resolveStackMetaField(mode: string, custom: string): string {
  if (mode === STACK_META_CUSTOM_VALUE) {
    return custom.trim();
  }
  return mode.trim();
}
