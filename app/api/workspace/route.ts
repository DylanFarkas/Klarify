/**
 * @fileoverview API Route — /api/workspace
 *
 * Punto de acceso autenticado al workspace persistido en Firestore.
 *   - GET   → devuelve workspace + preferencias del usuario
 *   - PATCH → guarda el estado de un agente o las preferencias
 *   - POST  → ejecuta acciones del pipeline (aprobar / resetear)
 *
 * Toda petición se autentica con `verifyRequestUser` (igual que /api/github).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import {
  getWorkspaceData,
  saveAgent1State,
  saveAgent2State,
  saveAgent3State,
  saveLastAgent,
  approveAgent1,
  approveAgent2,
  approveAgent3,
  resetAgent1,
  resetAgent2,
  resetAgent3,
  resetWorkspace,
} from '@/lib/workspace-service';
import type { Agent1State } from '@/lib/types/agent-1';
import type { Agent2State, Agent2Input } from '@/lib/types/agent-2';
import type { Agent3State } from '@/lib/types/agent-3';
import type { Agent3Input, Agent4Input } from '@/lib/types/workspace';

interface PatchBody {
  agent?: 'agent1' | 'agent2' | 'agent3';
  data?: Agent1State | Agent2State | Agent3State;
  preferences?: { lastAgent?: string };
}

interface PostBody {
  action?:
    | 'approveAgent1'
    | 'approveAgent2'
    | 'approveAgent3'
    | 'resetAgent1'
    | 'resetAgent2'
    | 'resetAgent3'
    | 'resetWorkspace';
  payload?: Agent2Input | Agent3Input | Agent4Input;
}

function handleError(error: unknown, fallback: string): NextResponse {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

  if (message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const data = await getWorkspaceData(uid);
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error, 'Error al obtener el workspace');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = (await request.json()) as PatchBody;

    if (body.preferences?.lastAgent !== undefined) {
      await saveLastAgent(uid, String(body.preferences.lastAgent));
      return NextResponse.json({ ok: true });
    }

    if (body.agent === 'agent1' && body.data) {
      await saveAgent1State(uid, body.data as Agent1State);
      return NextResponse.json({ ok: true });
    }

    if (body.agent === 'agent2' && body.data) {
      await saveAgent2State(uid, body.data as Agent2State);
      return NextResponse.json({ ok: true });
    }

    if (body.agent === 'agent3' && body.data) {
      await saveAgent3State(uid, body.data as Agent3State);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 });
  } catch (error) {
    return handleError(error, 'Error al guardar el workspace');
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = (await request.json()) as PostBody;

    switch (body.action) {
      case 'approveAgent1':
        await approveAgent1(uid, body.payload as Agent2Input);
        return NextResponse.json({ ok: true });
      case 'approveAgent2':
        await approveAgent2(uid, body.payload as Agent3Input);
        return NextResponse.json({ ok: true });
      case 'approveAgent3':
        await approveAgent3(uid, body.payload as Agent4Input);
        return NextResponse.json({ ok: true });
      case 'resetAgent1':
        await resetAgent1(uid);
        return NextResponse.json({ ok: true });
      case 'resetAgent2':
        await resetAgent2(uid);
        return NextResponse.json({ ok: true });
      case 'resetAgent3':
        await resetAgent3(uid);
        return NextResponse.json({ ok: true });
      case 'resetWorkspace':
        await resetWorkspace(uid);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }
  } catch (error) {
    return handleError(error, 'Error al actualizar el workspace');
  }
}
