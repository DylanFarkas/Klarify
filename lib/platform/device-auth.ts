/**
 * @fileoverview Device flow para `klarify login` (código en terminal + página web).
 */

import 'server-only';

import { randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { createCliToken } from '@/lib/platform/tokens';
import { platformInvalid, platformNotFound } from '@/lib/platform/errors';

const DEVICE_TTL_MS = 10 * 60 * 1000;
const POLL_INTERVAL_SECONDS = 3;
const USER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type DeviceAuthStatus = 'pending' | 'authorized' | 'consumed' | 'expired';

interface DeviceDoc {
  userCode: string;
  status: DeviceAuthStatus;
  expiresAt: number;
  token?: string;
  tokenName?: string;
  uid?: string;
}

function deviceCol() {
  return adminDb.collection('cliDeviceCodes');
}

function randomUserCode(): string {
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += USER_CODE_ALPHABET[bytes[i] % USER_CODE_ALPHABET.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function originFromRequest(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedHost) {
    const proto = forwardedProto ?? url.protocol.replace(':', '');
    return `${proto}://${forwardedHost}`;
  }
  return url.origin;
}

export async function startDeviceAuth(origin: string): Promise<{
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}> {
  const deviceCode = randomBytes(24).toString('hex');
  const userCode = randomUserCode().toUpperCase();
  const expiresAt = Date.now() + DEVICE_TTL_MS;

  await deviceCol().doc(deviceCode).set({
    userCode,
    status: 'pending',
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  });

  const verificationUri = `${origin}/cli/device`;
  return {
    deviceCode,
    userCode,
    verificationUri,
    verificationUriComplete: `${verificationUri}?user_code=${encodeURIComponent(userCode)}`,
    expiresIn: Math.floor(DEVICE_TTL_MS / 1000),
    interval: POLL_INTERVAL_SECONDS,
  };
}

async function findByUserCode(userCode: string): Promise<{ id: string; data: DeviceDoc } | null> {
  const normalized = userCode.trim().toUpperCase();
  const snap = await deviceCol().where('userCode', '==', normalized).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() as DeviceDoc };
}

export async function authorizeDevice(uid: string, userCode: string): Promise<{ userCode: string }> {
  const found = await findByUserCode(userCode);
  if (!found) {
    throw platformNotFound('Código de dispositivo inválido o caducado.', 'DEVICE_CODE_NOT_FOUND');
  }
  const { id, data } = found;
  if (data.expiresAt < Date.now()) {
    await deviceCol().doc(id).delete();
    throw platformInvalid('El código ha caducado. Vuelve a ejecutar klarify login.', 'DEVICE_EXPIRED');
  }
  if (data.status !== 'pending') {
    throw platformInvalid('Este código ya se usó.', 'DEVICE_ALREADY_USED');
  }

  const { token } = await createCliToken(uid, 'CLI device');
  await deviceCol().doc(id).set(
    {
      status: 'authorized',
      uid,
      token,
      tokenName: 'CLI device',
    },
    { merge: true }
  );
  return { userCode: data.userCode };
}

export async function pollDeviceAuth(deviceCode: string): Promise<{
  status: DeviceAuthStatus;
  token?: string;
  interval?: number;
}> {
  const trimmed = deviceCode.trim();
  if (!trimmed) {
    throw platformInvalid('Falta device_code.');
  }
  const snap = await deviceCol().doc(trimmed).get();
  if (!snap.exists) {
    throw platformNotFound('Dispositivo desconocido.', 'DEVICE_CODE_NOT_FOUND');
  }
  const data = snap.data() as DeviceDoc;
  if (data.expiresAt < Date.now()) {
    await snap.ref.delete();
    return { status: 'expired' };
  }
  if (data.status === 'pending') {
    return { status: 'pending', interval: POLL_INTERVAL_SECONDS };
  }
  if (data.status === 'consumed') {
    throw platformInvalid('El token ya se entregó. Ejecuta klarify login de nuevo.', 'DEVICE_CONSUMED');
  }
  if (data.status === 'authorized' && data.token) {
    await snap.ref.set({ status: 'consumed', token: FieldValue.delete() }, { merge: true });
    return { status: 'authorized', token: data.token };
  }
  return { status: data.status };
}
