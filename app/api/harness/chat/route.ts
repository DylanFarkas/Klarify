/**
 * @fileoverview API Route — /api/harness/chat
 *
 * Harness de edición de backlog con tool-calling (Klark).
 *   - GET  → historial corto del proyecto activo
 *   - POST → mensaje (o confirmedAction) con stream NDJSON
 */

import { type NextRequest, NextResponse } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { handleApiError } from '@/lib/api-error';
import { getHarnessHistory, clearHarnessHistory } from '@/lib/harness/history';
import { runHarnessTurn } from '@/lib/harness/runtime';
import type { HarnessConfirmedAction } from '@/lib/harness/types';
import { isPlanLimitError, planErrorToJson } from '@/lib/plans/plan-errors';
import { createNdjsonStream, ndjsonStreamResponse } from '@/lib/utils/llm-stream';
import { parseApiBody } from '@/lib/schemas/parse';
import { harnessChatBodySchema } from '@/lib/schemas/misc-api';

function assertPipelineReady(ready: boolean): void {
  if (!ready) {
    throw new Error(
      'Klark está disponible cuando el pipeline está completo (priorización aprobada).'
    );
  }
}

function projectIdFromRequest(request: NextRequest): string | null {
  const raw = request.nextUrl.searchParams.get('projectId');
  return raw && raw.trim() ? raw.trim() : null;
}

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const requestedProjectId = projectIdFromRequest(request);
    const { messages, projectId, pipelineReady } = await getHarnessHistory(
      uid,
      requestedProjectId
    );
    assertPipelineReady(pipelineReady);

    return NextResponse.json({ projectId, messages });
  } catch (error) {
    if (error instanceof Error && error.message.includes('pipeline')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return handleApiError(error, 'Error al cargar el historial de Klark');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const requestedProjectId = projectIdFromRequest(request);
    const { projectId, pipelineReady } = await clearHarnessHistory(
      uid,
      requestedProjectId
    );
    assertPipelineReady(pipelineReady);

    return NextResponse.json({ ok: true, projectId, messages: [] });
  } catch (error) {
    if (error instanceof Error && error.message.includes('pipeline')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return handleApiError(error, 'Error al limpiar el chat de Klark');
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = parseApiBody(harnessChatBodySchema, await request.json());
    const message = body.message ?? '';
    const confirmedAction = body.confirmedAction as HarnessConfirmedAction | undefined;
    const bodyProjectId =
      typeof body.projectId === 'string' && body.projectId.trim()
        ? body.projectId.trim()
        : null;

    const { stream, send, close } = createNdjsonStream();

    void (async () => {
      try {
        // Feedback inmediato en el stream (antes de leer workspace / Gemini).
        send({ type: 'thought', text: 'Analizando petición…' });

        // Misma señal v4 que GET (no depender del blob legacy agent6Input).
        const { pipelineReady, projectId } = await getHarnessHistory(uid, bodyProjectId);
        assertPipelineReady(pipelineReady);

        const result = await runHarnessTurn(
          {
            uid,
            message: message.trim() || 'Confirmado',
            confirmedAction,
            projectId,
          },
          (event) => send(event)
        );

        send({
          type: 'done',
          payload: {
            messages: result.messages,
            remaining: result.remaining,
          },
        });
      } catch (error) {
        if (isPlanLimitError(error)) {
          const planError = planErrorToJson(error);
          send({ type: 'error', error: planError.error });
        } else if (error instanceof Error && error.message.includes('pipeline')) {
          send({ type: 'error', error: error.message });
        } else {
          const msg =
            error instanceof Error ? error.message : 'Error en Klark';
          send({ type: 'error', error: msg });
        }
      } finally {
        close();
      }
    })();

    return ndjsonStreamResponse(stream);
  } catch (error) {
    if (isPlanLimitError(error)) {
      return NextResponse.json(planErrorToJson(error), { status: 403 });
    }
    if (error instanceof Error && error.message.includes('pipeline')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return handleApiError(error, 'Error al ejecutar Klark');
  }
}
