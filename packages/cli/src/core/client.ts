import { loadConfig, requireToken, type KlarifyConfig } from './config';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    if (body && typeof body === 'object' && 'code' in body) {
      this.code = String((body as { code?: string }).code);
    }
  }
}

function looksLikeHtml(text: string): boolean {
  const head = text.trimStart().slice(0, 32).toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html');
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (looksLikeHtml(text)) {
      return { error: 'html' };
    }
    return { error: text };
  }
}

function errorMessage(status: number, body: unknown, apiUrl?: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const err = String((body as { error: string }).error);
    if (err === 'html' || err.trimStart().toLowerCase().startsWith('<!doctype')) {
      const host = apiUrl ?? 'esta API';
      if (status === 404) {
        return (
          `La API CLI no está desplegada en ${host} (HTTP 404). ` +
          `En local funciona; sube/mergea a main (o al branch que despliega Vercel) y vuelve a intentar.`
        );
      }
      return `La API en ${host} devolvió HTML en vez de JSON (HTTP ${status}). ¿Está desplegada la ruta /api/v1?`;
    }
    return err;
  }
  return `HTTP ${status}`;
}

const inflightGets = new Map<string, Promise<unknown>>();

function getMethod(init: RequestInit): string {
  return (init.method ?? 'GET').toUpperCase();
}

async function request(
  path: string,
  init: RequestInit & { config?: KlarifyConfig; json?: unknown } = {}
): Promise<unknown> {
  const { json, config: provided, ...fetchInit } = init;
  const config = provided ?? (await loadConfig());
  const token = requireToken(config);
  const headers = new Headers(fetchInit.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...fetchInit,
    headers,
    body: json !== undefined ? JSON.stringify(json) : fetchInit.body,
  });
  const body = parseBody(await response.text());
  if (!response.ok) {
    throw new ApiError(errorMessage(response.status, body, config.apiUrl), response.status, body);
  }
  if (body && typeof body === 'object' && 'error' in body && (body as { error: string }).error === 'html') {
    throw new ApiError(errorMessage(response.status || 200, body, config.apiUrl), response.status || 200, body);
  }
  return body;
}

export async function api(
  path: string,
  init: RequestInit & { config?: KlarifyConfig; json?: unknown } = {}
): Promise<unknown> {
  if (getMethod(init) !== 'GET') {
    return request(path, init);
  }
  const existing = inflightGets.get(path);
  if (existing) return existing;
  const pending = request(path, init).finally(() => {
    inflightGets.delete(path);
  });
  inflightGets.set(path, pending);
  return pending;
}

export async function apiPublic(
  apiUrl: string,
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<unknown> {
  const base = apiUrl.replace(/\/$/, '');
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set('Content-Type', 'application/json');
  const { json, ...fetchInit } = init;
  const response = await fetch(`${base}${path}`, {
    ...fetchInit,
    headers,
    body: json !== undefined ? JSON.stringify(json) : fetchInit.body,
  });
  const body = parseBody(await response.text());
  if (!response.ok) {
    throw new ApiError(errorMessage(response.status, body, base), response.status, body);
  }
  if (body && typeof body === 'object' && 'error' in body && (body as { error: string }).error === 'html') {
    throw new ApiError(errorMessage(response.status || 200, body, base), response.status || 200, body);
  }
  return body;
}

export function projectPath(projectId: string, suffix = ''): string {
  return `/api/v1/projects/${encodeURIComponent(projectId)}${suffix}`;
}
