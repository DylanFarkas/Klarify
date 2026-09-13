/**
 * @fileoverview Servicio de planes — resolución, cuotas y configuración de IA.
 */

import { FieldValue, type DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { DEFAULT_PLAN_ID, getPlanLimits } from '@/lib/plans/definitions';
import { PlanLimitError } from '@/lib/plans/plan-errors';
import {
  canRegenerateWithPolicy,
  getRegenerationPolicy,
  getUpgradeTargetForRegeneration,
} from '@/lib/plans/regeneration-policy';
import { getEffectivePlanId } from '@/lib/plans/subscription-policy';
import type {
  AiGenerationConfig,
  PlanId,
  PlanSnapshot,
  RegenerationAgent,
  RegenerationUsage,
  UserSubscription,
  UserUsage,
} from '@/lib/plans/types';
import type { ProjectStatus } from '@/lib/types/project';
import {
  getCachedUserPlan,
  invalidateUserPlan,
  setCachedUserPlan,
} from '@/lib/server/runtime-cache';

function userDoc(uid: string) {
  return adminDb.collection('users').doc(uid);
}

function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function emptyUsage(): UserUsage {
  return {
    periodKey: currentPeriodKey(),
    regenerations: { agent2: 0, agent3: 0, agent4: 0, agent5: 0, stack: 0 },
    harnessMessages: 0,
  };
}

function normalizeUsage(raw: Partial<UserUsage> | undefined): UserUsage {
  const periodKey = currentPeriodKey();
  const base = emptyUsage();

  if (!raw || raw.periodKey !== periodKey) {
    return { ...base, periodKey };
  }

  return {
    periodKey,
    regenerations: {
      agent2: raw.regenerations?.agent2 ?? 0,
      agent3: raw.regenerations?.agent3 ?? 0,
      agent4: raw.regenerations?.agent4 ?? 0,
      agent5: raw.regenerations?.agent5 ?? 0,
      stack: raw.regenerations?.stack ?? 0,
    },
    harnessMessages: raw.harnessMessages ?? 0,
  };
}

function normalizeSubscription(raw: Partial<UserSubscription> | undefined): UserSubscription {
  const planId = raw?.planId ?? DEFAULT_PLAN_ID;
  const validIds: PlanId[] = ['free', 'starter', 'pro'];
  return {
    planId: validIds.includes(planId as PlanId) ? (planId as PlanId) : DEFAULT_PLAN_ID,
    status: raw?.status ?? 'active',
    ...(raw?.pastDueSince ? { pastDueSince: raw.pastDueSince } : {}),
  };
}

export async function ensureUserAccount(uid: string): Promise<DocumentSnapshot> {
  const snapshot = await userDoc(uid).get();
  if (snapshot.exists && snapshot.data()?.subscription) {
    return snapshot;
  }

  await userDoc(uid).set(
    {
      subscription: { planId: DEFAULT_PLAN_ID, status: 'active' },
      usage: emptyUsage(),
    },
    { merge: true }
  );

  return userDoc(uid).get();
}

export async function resolveUserPlan(
  uid: string,
  preloadedSnapshot?: DocumentSnapshot
): Promise<PlanSnapshot> {
  if (!preloadedSnapshot) {
    const cached = getCachedUserPlan(uid);
    if (cached) return cached;
  }

  const snapshot = preloadedSnapshot ?? (await ensureUserAccount(uid));
  const data = snapshot.data();
  const subscription = normalizeSubscription(
    data?.subscription as Partial<UserSubscription> | undefined
  );
  const usage = normalizeUsage(data?.usage as Partial<UserUsage> | undefined);
  const effectivePlanId = getEffectivePlanId(subscription);

  if (data?.usage && (data.usage as UserUsage).periodKey !== usage.periodKey) {
    invalidateUserPlan(uid);
    await userDoc(uid).set({ usage }, { merge: true });
  }

  const plan: PlanSnapshot = {
    id: effectivePlanId,
    limits: getPlanLimits(effectivePlanId),
    usage,
    subscription,
  };
  setCachedUserPlan(uid, plan);
  return plan;
}

export async function getActiveProjectId(uid: string): Promise<string | null> {
  const snapshot = await userDoc(uid).get();
  const prefs = snapshot.data()?.preferences as { activeProjectId?: string } | undefined;
  return prefs?.activeProjectId ?? null;
}

export function getAiConfig(planId: PlanId): AiGenerationConfig {
  const limits = getPlanLimits(planId);
  return {
    thinkingBudget: limits.thinkingBudget,
    maxEpics: limits.maxEpics,
    maxStories: limits.maxStories,
    maxStoriesPerEpic: limits.maxStoriesPerEpic,
    backlogDetail: limits.backlogDetail,
  };
}

export async function assertCanCreateProject(
  uid: string,
  totalProjectCount: number
): Promise<void> {
  const plan = await resolveUserPlan(uid);
  if (totalProjectCount >= plan.limits.maxProjects) {
    throw new PlanLimitError(
      `Tu plan ${plan.id} permite hasta ${plan.limits.maxProjects} proyecto(s).`,
      'PLAN_PROJECT_LIMIT',
      { upgradeTo: plan.id === 'free' ? 'starter' : plan.id === 'starter' ? 'pro' : undefined }
    );
  }
}

export function assertProjectSlotAccessible(status: ProjectStatus): void {
  if (status === 'locked') {
    throw new PlanLimitError(
      'Este proyecto está bloqueado por el límite de tu plan. Actívalo desde Tus proyectos o mejora tu plan.',
      'PLAN_PROJECT_LOCKED',
      { upgradeTo: 'starter' }
    );
  }
}

export async function checkAndIncrementRegeneration(
  uid: string,
  agent: RegenerationAgent
): Promise<{ remaining: number | null }> {
  const plan = await resolveUserPlan(uid);
  const check = canRegenerateWithPolicy(plan.id, agent, plan.usage.regenerations);

  if (!check.allowed) {
    const policy = getRegenerationPolicy(plan.id);
    if (policy.mode === 'blocked') {
      throw new PlanLimitError(
        'La regeneración de resultados no está disponible en tu plan.',
        'PLAN_REGENERATION_BLOCKED',
        { upgradeTo: getUpgradeTargetForRegeneration(plan.id) }
      );
    }
    throw new PlanLimitError(
      `Has alcanzado el límite de regeneraciones de este mes para este agente.`,
      'PLAN_REGENERATION_LIMIT',
      { upgradeTo: getUpgradeTargetForRegeneration(plan.id), remaining: 0 }
    );
  }

  const policy = getRegenerationPolicy(plan.id);
  if (policy.mode === 'unlimited') {
    return { remaining: null };
  }

  const updatedRegenerations: RegenerationUsage = {
    ...plan.usage.regenerations,
    [agent]: plan.usage.regenerations[agent] + 1,
  };

  await userDoc(uid).set(
    {
      usage: {
        periodKey: plan.usage.periodKey,
        regenerations: updatedRegenerations,
        harnessMessages: plan.usage.harnessMessages,
      },
    },
    { merge: true }
  );
  invalidateUserPlan(uid);

  const remaining =
    policy.mode === 'monthly'
      ? Math.max(0, policy.perAgent - updatedRegenerations[agent])
      : null;

  return { remaining };
}

/** Comprueba e incrementa el contador mensual de mensajes del harness de backlog. */
export async function checkAndIncrementHarnessMessage(
  uid: string
): Promise<{ remaining: number | null }> {
  const plan = await resolveUserPlan(uid);
  const limit = plan.limits.maxHarnessMessages;

  if (limit === null) {
    return { remaining: null };
  }

  const used = plan.usage.harnessMessages;
  if (used >= limit) {
    throw new PlanLimitError(
      `Has alcanzado el límite de mensajes de Klark este mes (${limit}).`,
      'PLAN_HARNESS_LIMIT',
      {
        upgradeTo: plan.id === 'free' ? 'starter' : plan.id === 'starter' ? 'pro' : undefined,
        remaining: 0,
      }
    );
  }

  const harnessMessages = used + 1;
  await userDoc(uid).set(
    {
      usage: {
        periodKey: plan.usage.periodKey,
        regenerations: plan.usage.regenerations,
        harnessMessages,
      },
    },
    { merge: true }
  );
  invalidateUserPlan(uid);

  return { remaining: Math.max(0, limit - harnessMessages) };
}
