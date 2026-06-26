/**
 * @fileoverview Cliente HTTP autenticado para el frontend.
 *
 * Centraliza el envío del ID token de Firebase en el header `Authorization`,
 * de forma que las API routes puedan verificar al usuario con `verifyRequestUser`.
 */

import type { User } from 'firebase/auth';
import type { WorkspaceResponse } from '@/lib/types/workspace';

/** Hace un fetch añadiendo el ID token del usuario como Bearer token. */
export async function authFetch(
  url: string,
  user: User,
  init: RequestInit = {}
): Promise<Response> {
  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);
  return fetch(url, { ...init, headers });
}

/** Carga el workspace + preferencias del usuario autenticado. */
export async function fetchWorkspace(user: User): Promise<WorkspaceResponse> {
  const response = await authFetch('/api/workspace', user);
  if (!response.ok) {
    throw new Error('No se pudo cargar el workspace');
  }
  return (await response.json()) as WorkspaceResponse;
}

/** Persiste el último agente visitado en las preferencias del usuario. */
export async function saveLastAgent(user: User, lastAgent: string): Promise<void> {
  await authFetch('/api/workspace', user, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences: { lastAgent } }),
  });
}