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

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

function errorMessage(status: number, body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    return String((body as { error: string }).error);
  }
  return `HTTP ${status}`;
}

export async function api(
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
    throw new ApiError(errorMessage(response.status, body), response.status, body);
  }
  return body;
}

export async function apiPublic(
  apiUrl: string,
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<unknown> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set('Content-Type', 'application/json');
  const { json, ...fetchInit } = init;
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
    ...fetchInit,
    headers,
    body: json !== undefined ? JSON.stringify(json) : fetchInit.body,
  });
  const body = parseBody(await response.text());
  if (!response.ok) {
    throw new ApiError(errorMessage(response.status, body), response.status, body);
  }
  return body;
}

export function projectPath(projectId: string, suffix = ''): string {
  return `/api/v1/projects/${encodeURIComponent(projectId)}${suffix}`;
}
