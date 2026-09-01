/**
 * @fileoverview API Route — POST /api/agentes/1/extract
 *
 * Extrae deseos a partir del contexto enriquecido con las respuestas
 * del usuario a las preguntas de discovery (o saltando el paso).
 * Emite actividad del agente en tiempo real vía NDJSON stream.
 */

import { type NextRequest } from 'next/server';
import {
  extractWishesFromContextStream,
  validateClarificationAnswers,
} from '@/lib/services/agent-1-service';
import type {
  Agent1ExtractRequest,
  Agent1ExtractResponse,
  Agent1ErrorResponse,
} from '@/lib/types/agent-1';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { getAiConfig, resolveUserPlan } from '@/lib/plans/plan-service';
import { AGENT_ACTIVITY, PREP_ACTION_MIN_VISIBLE_MS } from '@/lib/constants/agent-activity';
import {
  AgentStreamEmitter,
  createNdjsonStream,
  ndjsonStreamResponse,
} from '@/lib/utils/llm-stream';
import { handleApiError } from '@/lib/api-error';
import { parseApiBody } from '@/lib/schemas/parse';
import { agent1ExtractBodySchema } from '@/lib/schemas/agent-inputs';
import type { ClarificationAnswer, ContextDiscovery } from '@/lib/types/agent-1';

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const aiConfig = getAiConfig((await resolveUserPlan(uid)).id);

    const parsed = parseApiBody(agent1ExtractBodySchema, await request.json());
    const body = {
      transcription: parsed.transcription as unknown as Agent1ExtractRequest['transcription'],
      discovery: parsed.discovery as unknown as ContextDiscovery,
      answers: (parsed.answers ?? []) as unknown as ClarificationAnswer[],
      skipped: parsed.skipped ?? false,
    } satisfies Agent1ExtractRequest;
    const skipped = body.skipped ?? false;
    const answers = body.answers ?? [];

    const validation = validateClarificationAnswers(body.discovery, answers, skipped);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error!, code: 'VALIDATION_ERROR' } satisfies Agent1ErrorResponse,
        { status: 400 }
      );
    }

    const { stream, send, close } = createNdjsonStream();

    void (async () => {
      const emitter = new AgentStreamEmitter(send);

      try {
        const { wishes, enrichedContext } = await emitter.runPhase(
          AGENT_ACTIVITY.PHASE_EXTRACT.id,
          AGENT_ACTIVITY.PHASE_EXTRACT.label,
          async () => {
            await emitter.runAction(
              AGENT_ACTIVITY.ACTION_MERGE_CLARIFICATIONS.id,
              AGENT_ACTIVITY.ACTION_MERGE_CLARIFICATIONS.label,
              async () => undefined,
              { minVisibleMs: PREP_ACTION_MIN_VISIBLE_MS }
            );

            return emitter.runAction(
              AGENT_ACTIVITY.ACTION_EXTRACT_WISHES.id,
              AGENT_ACTIVITY.ACTION_EXTRACT_WISHES.label,
              () =>
                extractWishesFromContextStream(
                  uid,
                  body.transcription,
                  body.discovery,
                  emitter.bindThought(),
                  answers,
                  skipped,
                  aiConfig
                )
            );
          }
        );

        const response: Agent1ExtractResponse = { wishes, enrichedContext };
        send({ type: 'done', payload: response });
      } catch (error) {
        console.error('[Agent 1 Extract] Stream error:', error);
        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Error interno al extraer deseos.',
        });
      } finally {
        close();
      }
    })();

    return ndjsonStreamResponse(stream);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return Response.json({ error: 'No autorizado', code: 'PROCESSING_ERROR' } satisfies Agent1ErrorResponse, { status: 401 });
    }

    return handleApiError(error, 'Error interno al extraer deseos.');
  }
}
