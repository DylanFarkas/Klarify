/**
 * Cache en memoria del proceso Node para lecturas calientes de Firestore.
 * Recorta RTTs repetidos (plan de usuario / plan de sprints) entre mutaciones
 * cercanas. TTL corto: los gates de plan no necesitan consistencia estricta.
 */

import 'server-only';

import type { SprintPlan } from '@/lib/types/agent-5';
import type { PlanSnapshot } from '@/lib/plans/types';

const DEFAULT_TTL_MS = 45_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function readEntry<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return undefined;
  }
  return entry.value;
}

function writeEntry<T>(
  map: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs = DEFAULT_TTL_MS
): void {
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

const userPlanByUid = new Map<string, CacheEntry<PlanSnapshot>>();
/** `null` cacheado = proyecto sin plan (también es un hit). */
const pipelinePlanByKey = new Map<string, CacheEntry<SprintPlan | null>>();

function pipelineKey(uid: string, projectId: string): string {
  return `${uid}:${projectId}`;
}

export function getCachedUserPlan(uid: string): PlanSnapshot | undefined {
  return readEntry(userPlanByUid, uid);
}

export function setCachedUserPlan(uid: string, plan: PlanSnapshot): void {
  writeEntry(userPlanByUid, uid, plan);
}

export function invalidateUserPlan(uid: string): void {
  userPlanByUid.delete(uid);
}

export function getCachedPipelinePlan(
  uid: string,
  projectId: string
): SprintPlan | null | undefined {
  return readEntry(pipelinePlanByKey, pipelineKey(uid, projectId));
}

export function setCachedPipelinePlan(
  uid: string,
  projectId: string,
  plan: SprintPlan | null
): void {
  writeEntry(pipelinePlanByKey, pipelineKey(uid, projectId), plan);
}

export function invalidatePipelinePlan(uid: string, projectId: string): void {
  pipelinePlanByKey.delete(pipelineKey(uid, projectId));
}
