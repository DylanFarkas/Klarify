/**
 * @fileoverview PATs de Klarify CLI (`klf_…`). El secreto nunca se vuelve a leer.
 */

import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { platformInvalid, platformNotFound } from '@/lib/platform/errors';

export const CLI_TOKEN_PREFIX = 'klf_';
export const MAX_CLI_TOKENS_PER_USER = 8;

export interface CliTokenRecord {
  id: string;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsedAt: number | null;
}

interface CliTokenIndex {
  uid: string;
  tokenId: string;
  hash: string;
}

function tokensCol(uid: string) {
  return adminDb.collection('users').doc(uid).collection('cliTokens');
}

function tokenIndexCol() {
  return adminDb.collection('cliTokenIndex');
}

export function hashCliToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateCliToken(): string {
  return `${CLI_TOKEN_PREFIX}${randomBytes(24).toString('base64url')}`;
}

export function isCliToken(value: string): boolean {
  return value.startsWith(CLI_TOKEN_PREFIX) && value.length >= CLI_TOKEN_PREFIX.length + 16;
}

function tokenPrefix(token: string): string {
  return token.slice(0, 12);
}

export async function verifyCliToken(token: string): Promise<string> {
  if (!isCliToken(token)) {
    throw new Error('UNAUTHORIZED');
  }
  const hash = hashCliToken(token);
  const indexSnap = await tokenIndexCol().doc(hash).get();
  if (!indexSnap.exists) {
    throw new Error('UNAUTHORIZED');
  }
  const index = indexSnap.data() as CliTokenIndex;
  const storedHash = index.hash ?? hash;
  const a = Buffer.from(storedHash, 'utf8');
  const b = Buffer.from(hash, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('UNAUTHORIZED');
  }

  const metaRef = tokensCol(index.uid).doc(index.tokenId);
  const metaSnap = await metaRef.get();
  if (!metaSnap.exists) {
    await indexSnap.ref.delete();
    throw new Error('UNAUTHORIZED');
  }

  const meta = metaSnap.data();
  const lastUsedAt = typeof meta?.lastUsedAt === 'number' ? meta.lastUsedAt : 0;
  if (Date.now() - lastUsedAt > 5 * 60 * 1000) {
    await metaRef.set({ lastUsedAt: Date.now() }, { merge: true });
  }
  return index.uid;
}

export async function listCliTokens(uid: string): Promise<CliTokenRecord[]> {
  const snap = await tokensCol(uid).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: typeof data.name === 'string' ? data.name : 'Token',
        prefix: typeof data.prefix === 'string' ? data.prefix : 'klf_…',
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
        lastUsedAt: typeof data.lastUsedAt === 'number' ? data.lastUsedAt : null,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createCliToken(
  uid: string,
  name: string
): Promise<{ token: string; record: CliTokenRecord }> {
  const trimmed = name.trim() || 'CLI';
  const existing = await tokensCol(uid).get();
  if (existing.size >= MAX_CLI_TOKENS_PER_USER) {
    throw platformInvalid(
      `Máximo ${MAX_CLI_TOKENS_PER_USER} tokens CLI. Revoca uno para crear otro.`,
      'TOKEN_LIMIT'
    );
  }

  const token = generateCliToken();
  const hash = hashCliToken(token);
  const tokenId = randomBytes(8).toString('hex');
  const now = Date.now();
  const record: CliTokenRecord = {
    id: tokenId,
    name: trimmed,
    prefix: tokenPrefix(token),
    createdAt: now,
    lastUsedAt: null,
  };

  const batch = adminDb.batch();
  batch.set(tokensCol(uid).doc(tokenId), {
    name: trimmed,
    prefix: record.prefix,
    hash,
    createdAt: now,
    lastUsedAt: null,
  });
  batch.set(tokenIndexCol().doc(hash), {
    uid,
    tokenId,
    hash,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return { token, record };
}

export async function revokeCliToken(uid: string, tokenId: string): Promise<void> {
  const metaRef = tokensCol(uid).doc(tokenId);
  const metaSnap = await metaRef.get();
  if (!metaSnap.exists) {
    throw platformNotFound('Token no encontrado.', 'TOKEN_NOT_FOUND');
  }

  const hash = typeof metaSnap.data()?.hash === 'string' ? (metaSnap.data()?.hash as string) : null;
  const batch = adminDb.batch();
  batch.delete(metaRef);
  if (hash) {
    batch.delete(tokenIndexCol().doc(hash));
  }
  await batch.commit();
}
