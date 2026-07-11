/**
 * Helpers tipados sobre Sileo para feedback de CRUD en el workspace.
 */

import { sileo, type SileoOptions } from 'sileo';

type ToastInput = string | Pick<SileoOptions, 'title' | 'description'>;

function toOptions(input: ToastInput, extra?: Partial<SileoOptions>): SileoOptions {
  if (typeof input === 'string') {
    return { title: input, ...extra };
  }
  return { ...input, ...extra };
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

/** Extrae mensaje legible de un error desconocido. */
export function errorMessage(err: unknown, fallback = 'No se pudo completar la acción'): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}
