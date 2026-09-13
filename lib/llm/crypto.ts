/**
 * @fileoverview Cifrado AES-256-GCM para API keys BYOK.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const raw = process.env.AI_PROVIDER_ENCRYPTION_KEY;
  if (!raw || !raw.trim()) {
    throw new Error('AI_PROVIDER_ENCRYPTION_KEY no está configurada');
  }
  // Acepta hex de 64 chars o cualquier string (se deriva a 32 bytes via SHA-256).
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return createHash('sha256').update(trimmed).digest();
}

/** Cifra texto plano → `iv:authTag:ciphertext` en base64url segments. */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptSecret(payload: string): string {
  const key = getEncryptionKey();
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de secreto cifrado inválido');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64url');
  const authTag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function keyHintFromApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 4) return trimmed;
  return trimmed.slice(-4);
}

export function hasEncryptionKeyConfigured(): boolean {
  return Boolean(process.env.AI_PROVIDER_ENCRYPTION_KEY?.trim());
}
