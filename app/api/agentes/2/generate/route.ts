/**
 * @fileoverview API Route — POST /api/agentes/2/generate
 */

import { type NextRequest, NextResponse } from 'next/server';
import { validateAgent2Input, generateBacklogStream } from '@/lib/services/agent-2-service';
import type { Agent2Input, Agent2GenerateResponse, Agent2ErrorResponse } from '@/lib/types/agent-2';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { handleApiError } from '@/lib/api-error';
import { AGENT_ACTIVITY, PREP_ACTION_MIN_VISIBLE_MS } from '@/lib/constants/agent-activity';
import { getAiConfig, resolveUserPlan } from '@/lib/plans/plan-service';
import { assertAiRegenerationAllowed } from '@/lib/plans/regeneration-guard';
import { truncateBacklogToPlanLimits } from '@/lib/plans/truncate-backlog';
import { isPlanLimitError, planErrorToJson } from '@/lib/plans/plan-errors';
import {
  AgentStreamEmitter,
  createNdjsonStream,
  ndjsonStreamResponse,
} from '@/lib/utils/llm-stream';
import { parseApiBody } from '@/lib/schemas/parse';
import { agent2GenerateBodySchema } from '@/lib/schemas/agent-inputs';

type GenerateBody = Agent2Input & { isRegeneration?: boolean };

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = parseApiBody(
      agent2GenerateBodySchema,
      await request.json()
    ) as GenerateBody;

    const validation = validateAgent2Input(body);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error!, code: validation.code! } satisfies Agent2ErrorResponse,
        { status: 400 }
      );
    }

    await assertAiRegenerationAllowed(uid, 'agent2', body.isRegeneration);
    const plan = await resolveUserPlan(uid);
    const aiConfig = getAiConfig(plan.id);

    const { stream, send, close } = createNdjsonStream();
    const wishCount = body.wishes.length;
    const readWishesLabel = `${wishCount} deseo${wishCount !== 1 ? 's' : ''} aprobado${wishCount !== 1 ? 's' : ''}`;

    void (async () => {
      const emitter = new AgentStreamEmitter(send);

      try {
        const rawEpics = await emitter.runPhase(
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
              () =>
                generateBacklogStream(
                  uid,
                  body.wishes,
                  emitter.bindThought(),
                  body.transcription,
                  aiConfig
                )
            );
          }
        );

        const { epics, truncated, message } = truncateBacklogToPlanLimits(rawEpics, aiConfig);
        const response: Agent2GenerateResponse = {
          epics,
          ...(truncated ? { truncated: true, truncationMessage: message } : {}),
        };
        send({ type: 'done', payload: response });
      } catch (error) {
        console.error('[Agent 2 Generate] Stream error:', error);
        if (isPlanLimitError(error)) {
          send({ type: 'error', ...planErrorToJson(error) });
        } else {
          send({
            type: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Error interno al generar el backlog. Intente de nuevo.',
          });
        }
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

    if (isPlanLimitError(error)) {
      return NextResponse.json(planErrorToJson(error), { status: 403 });
    }

    return handleApiError(error, 'Error interno al generar el backlog. Intente de nuevo.');
  }
}
