/**
 * @fileoverview API Route — POST /api/agentes/2/generate
 *
 * Recibe los wishes y transcription vía JSON, los valida,
 * y devuelve el backlog generado con Épicas e Historias.
 * Emite actividad del agente en tiempo real vía NDJSON stream.
 */

import { type NextRequest } from 'next/server';
import { validateAgent2Input, generateBacklogStream } from '@/lib/services/agent-2-service';
import type { Agent2Input, Agent2GenerateResponse, Agent2ErrorResponse } from '@/lib/types/agent-2';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { AGENT_ACTIVITY, PREP_ACTION_MIN_VISIBLE_MS } from '@/lib/constants/agent-activity';
import {
  AgentStreamEmitter,
  createNdjsonStream,
  ndjsonStreamResponse,
} from '@/lib/utils/llm-stream';

export async function POST(request: NextRequest) {
  try {
    await verifyRequestUser(request);

    const body = (await request.json()) as Agent2Input;

    const validation = validateAgent2Input(body);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error!, code: validation.code! } satisfies Agent2ErrorResponse,
        { status: 400 }
      );
    }

    const { stream, send, close } = createNdjsonStream();
    const wishCount = body.wishes.length;
    const readWishesLabel = `${wishCount} deseo${wishCount !== 1 ? 's' : ''} aprobado${wishCount !== 1 ? 's' : ''}`;

    void (async () => {
      const emitter = new AgentStreamEmitter(send);

      try {
        const epics = await emitter.runPhase(
          AGENT_ACTIVITY.PHASE_GENERATE.id,
          AGENT_ACTIVITY.PHASE_GENERATE.label,
          async () => {
            await emitter.runAction(
              AGENT_ACTIVITY.ACTION_READ_WISHES.id,
              readWishesLabel,
              async () => undefined,
              { minVisibleMs: PREP_ACTION_MIN_VISIBLE_MS }
            );

            await emitter.runAction(
              AGENT_ACTIVITY.ACTION_GROUP_EPICS.id,
              AGENT_ACTIVITY.ACTION_GROUP_EPICS.label,
              async () => undefined,
              { minVisibleMs: PREP_ACTION_MIN_VISIBLE_MS }
            );

            return emitter.runAction(
              AGENT_ACTIVITY.ACTION_GENERATE_STORIES.id,
              AGENT_ACTIVITY.ACTION_GENERATE_STORIES.label,
              () => generateBacklogStream(body.wishes, emitter.bindThought(), body.transcription)
            );
          }
        );

        const response: Agent2GenerateResponse = { epics };
        send({ type: 'done', payload: response });
      } catch (error) {
        console.error('[Agent 2 Generate] Stream error:', error);
        send({
          type: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Error interno al generar el backlog. Intente de nuevo.',
        });
      } finally {
        close();
      }
    })();

    return ndjsonStreamResponse(stream);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return Response.json(
        { error: 'No autorizado', code: 'PROCESSING_ERROR' } satisfies Agent2ErrorResponse,
        { status: 401 }
      );
    }

    console.error('[Agent 2 Generate] Error:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Error interno al generar el backlog. Intente de nuevo.',
        code: 'PROCESSING_ERROR',
      } satisfies Agent2ErrorResponse,
      { status: 500 }
    );
  }
}
