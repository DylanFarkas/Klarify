/**
 * @fileoverview API Route — POST /api/agentes/1/analyze
 *
 * Evalúa si el contexto del usuario es suficiente para un backlog.
 * Si lo es, extrae deseos directamente en la misma request.
 * Emite actividad del agente en tiempo real vía NDJSON stream.
 */

import { type NextRequest } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import {
  analyzeContextStream,
  extractWishesFromContextStream,
} from '@/lib/services/agent-1-service';
import type {
  Agent1AnalyzeRequest,
  Agent1AnalyzeResponse,
  Agent1ErrorResponse,
} from '@/lib/types/agent-1';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { getAiConfig, resolveUserPlan } from '@/lib/plans/plan-service';
import type { AiGenerationConfig } from '@/lib/plans/types';
import { AGENT_ACTIVITY, PREP_ACTION_MIN_VISIBLE_MS } from '@/lib/constants/agent-activity';
import {
  AgentStreamEmitter,
  createNdjsonStream,
  ndjsonStreamResponse,
} from '@/lib/utils/llm-stream';
import { parseApiBody } from '@/lib/schemas/parse';
import { agent1AnalyzeBodySchema } from '@/lib/schemas/agent-inputs';

async function runExtraction(
  uid: string,
  emitter: AgentStreamEmitter,
  body: Agent1AnalyzeRequest,
  discovery: Awaited<ReturnType<typeof analyzeContextStream>>,
  aiConfig: AiGenerationConfig
) {
  return emitter.runPhase(
    AGENT_ACTIVITY.PHASE_EXTRACT.id,
    AGENT_ACTIVITY.PHASE_EXTRACT.label,
    async () => {
      await emitter.runAction(
        AGENT_ACTIVITY.ACTION_BUILD_CONTEXT.id,
        AGENT_ACTIVITY.ACTION_BUILD_CONTEXT.label,
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
            discovery,
            emitter.bindThought(),
            [],
            false,
            aiConfig
          )
      );
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const aiConfig = getAiConfig((await resolveUserPlan(uid)).id);

    const body = parseApiBody(
      agent1AnalyzeBodySchema,
      await request.json()
    ) as unknown as Agent1AnalyzeRequest;

    const { stream, send, close } = createNdjsonStream();

    void (async () => {
      const emitter = new AgentStreamEmitter(send);

      try {
        const discovery = await emitter.runPhase(
          AGENT_ACTIVITY.PHASE_ASSESS.id,
          AGENT_ACTIVITY.PHASE_ASSESS.label,
          async () => {
            await emitter.runAction(
              AGENT_ACTIVITY.ACTION_READ_TRANSCRIPTION.id,
              AGENT_ACTIVITY.ACTION_READ_TRANSCRIPTION.label,
              async () => undefined,
              { minVisibleMs: PREP_ACTION_MIN_VISIBLE_MS }
            );

            return emitter.runAction(
              AGENT_ACTIVITY.ACTION_ANALYZE_CONTEXT.id,
              AGENT_ACTIVITY.ACTION_ANALYZE_CONTEXT.label,
              () => analyzeContextStream(uid, body.transcription, emitter.bindThought(), aiConfig)
            );
          }
        );

        if (!discovery.isSufficient && discovery.questions.length === 0) {
          const { wishes, enrichedContext } = await runExtraction(uid, emitter, body, discovery, aiConfig);

          const response: Agent1AnalyzeResponse = {
            discovery: { ...discovery, isSufficient: true, completedAt: Date.now() },
            wishes,
            enrichedContext,
          };
          send({ type: 'done', payload: response });
          return;
        }

        if (discovery.isSufficient) {
          const { wishes, enrichedContext } = await runExtraction(uid, emitter, body, discovery, aiConfig);

          const response: Agent1AnalyzeResponse = {
            discovery: { ...discovery, completedAt: Date.now() },
            wishes,
            enrichedContext,
          };
          send({ type: 'done', payload: response });
          return;
        }

        const response: Agent1AnalyzeResponse = { discovery };
        send({ type: 'done', payload: response });
      } catch (error) {
        console.error('[Agent 1 Analyze] Stream error:', error);
        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Error interno al analizar el contexto.',
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

    return handleApiError(error, 'Error interno al analizar el contexto.');
  }
}
