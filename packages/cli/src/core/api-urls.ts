/** Bases de API soportadas por el CLI y la TUI. */
export const LOCAL_API_URL = 'http://localhost:3000';
export const PROD_API_URL = 'https://klarify.vercel.app';

/** Default público: Cloud. Local es opt-in para quien desarrolla Klarify. */
export const DEFAULT_API_URL = PROD_API_URL;

export const API_ENVIRONMENTS = [
  {
    id: 'prod' as const,
    label: 'Cloud',
    description: 'https://klarify.vercel.app',
    apiUrl: PROD_API_URL,
  },
  {
    id: 'local' as const,
    label: 'Local',
    description: 'http://localhost:3000 (desarrollo)',
    apiUrl: LOCAL_API_URL,
  },
] as const;

export type ApiEnvironmentId = (typeof API_ENVIRONMENTS)[number]['id'];

const ALLOWED = new Set<string>([LOCAL_API_URL, PROD_API_URL]);

/** Quita barra final y normaliza alias triviales al canónico permitido. */
export function normalizeApiUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_API_URL;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    const port = url.port;

    if (host === 'localhost' || host === '127.0.0.1') {
      if (!port || port === '3000') return LOCAL_API_URL;
    }
    if (host === 'klarify.vercel.app' && (url.protocol === 'https:' || url.protocol === 'http:')) {
      return PROD_API_URL;
    }
  } catch {
    // Se valida abajo.
  }

  return trimmed;
}

export function isAllowedApiUrl(url: string): boolean {
  return ALLOWED.has(normalizeApiUrl(url));
}

export function resolveApiUrl(raw?: string | null): string {
  const normalized = normalizeApiUrl(raw || DEFAULT_API_URL);
  if (!ALLOWED.has(normalized)) {
    throw new Error(
      `API no soportada: ${raw}. Usa ${PROD_API_URL} o ${LOCAL_API_URL}.`
    );
  }
  return normalized;
}

export function environmentForApiUrl(apiUrl: string): (typeof API_ENVIRONMENTS)[number] {
  const normalized = normalizeApiUrl(apiUrl);
  return API_ENVIRONMENTS.find((item) => item.apiUrl === normalized) ?? API_ENVIRONMENTS[0]!;
}
