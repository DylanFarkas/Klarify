/**
 * Helpers tipados sobre Sileo para feedback de CRUD en el workspace.
 */

import { sileo, type SileoButton, type SileoOptions } from 'sileo';

type ToastInput = string | Pick<SileoOptions, 'title' | 'description'>;

/** Duración por defecto de toasts con botón (más larga que el Toaster). */
const ACTION_DURATION_MS = 6000;

function toOptions(input: ToastInput, extra?: Partial<SileoOptions>): SileoOptions {
  if (typeof input === 'string') {
    return { title: input, ...extra };
  }
  return { ...input, ...extra };
}

function resolveOptions<T>(
  input: ToastInput | ((value: T) => ToastInput),
  value: T,
  extra?: Partial<SileoOptions>
): SileoOptions {
  const resolved = typeof input === 'function' ? input(value) : input;
  return toOptions(resolved, extra);
}

export function notifySuccess(input: ToastInput, extra?: Partial<SileoOptions>) {
  return sileo.success(toOptions(input, extra));
}

export function notifyError(input: ToastInput, extra?: Partial<SileoOptions>) {
  return sileo.error(toOptions(input, extra));
}

export function notifyWarning(input: ToastInput, extra?: Partial<SileoOptions>) {
  return sileo.warning(toOptions(input, extra));
}

export function notifyInfo(input: ToastInput, extra?: Partial<SileoOptions>) {
  return sileo.info(toOptions(input, extra));
}

export type NotifyActionOptions = {
  title?: string;
  description?: SileoOptions['description'];
  button: SileoButton;
  duration?: number | null;
};

/** Toast con botón de acción. Duración ampliada para poder pulsar el CTA. */
export function notifyAction(input: NotifyActionOptions, extra?: Partial<SileoOptions>) {
  const { button, duration = ACTION_DURATION_MS, title, description } = input;
  return sileo.action({
    title,
    description,
    button,
    duration,
    ...extra,
  });
}

type PromiseMessages<T> = {
  loading: ToastInput;
  success: ToastInput | ((data: T) => ToastInput);
  error: ToastInput | ((err: unknown) => ToastInput);
  action?: (data: T) => NotifyActionOptions;
};

/** Encadena loading → success/error (u action) desde una Promise. Devuelve la Promise original. */
export function notifyPromise<T>(
  promise: Promise<T> | (() => Promise<T>),
  messages: PromiseMessages<T>
): Promise<T> {
  return sileo.promise(promise, {
    loading: toOptions(messages.loading),
    success: (data) => resolveOptions(messages.success, data),
    error: (err) => resolveOptions(messages.error, err),
    ...(messages.action
      ? {
          action: (data: T) => {
            const opts = messages.action!(data);
            const { button, duration = ACTION_DURATION_MS, title, description } = opts;
            return { title, description, button, duration };
          },
        }
      : {}),
  });
}

/** Extrae mensaje legible de un error desconocido. */
export function errorMessage(err: unknown, fallback = 'No se pudo completar la acción'): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}
