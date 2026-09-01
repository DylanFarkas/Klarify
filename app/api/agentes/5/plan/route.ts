/**
 * @fileoverview API Route — POST /api/agentes/5/plan
 *
 * Sigue la dinámica del Agente 4 de Klarify: valida vía JSON,
 * delega al servicio de planificación de sprints, y emite la actividad
 * del Scrum Master en tiempo real a través de streams NDJSON.
 */

import { type NextRequest } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { getAiConfig, resolveUserPlan } from '@/lib/plans/plan-service';
import { assertAiRegenerationAllowed } from '@/lib/plans/regeneration-guard';
import { isPlanLimitError, planErrorToJson } from '@/lib/plans/plan-errors';
import { PREP_ACTION_MIN_VISIBLE_MS } from '@/lib/constants/agent-activity';
import type { Agent5Input } from '@/lib/types/workspace';
import {
  validateAgent5Input,
  planSprintsStream,
} from '@/lib/services/agent-5-service';
import {
  AgentStreamEmitter,
  createNdjsonStream,
  ndjsonStreamResponse,
} from '@/lib/utils/llm-stream';
import type { Agent5PlanResponse, Agent5PlanRequest } from '@/lib/types/agent-5';
import { handleApiError } from '@/lib/api-error';
import { parseApiBody } from '@/lib/schemas/parse';
import { agent5PlanBodySchema } from '@/lib/schemas/agent-inputs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = parseApiBody(
      agent5PlanBodySchema,
      await request.json()
    ) as Agent5PlanRequest & { isRegeneration?: boolean };

    await assertAiRegenerationAllowed(uid, 'agent5', body.isRegeneration);
    const aiConfig = getAiConfig((await resolveUserPlan(uid)).id);

    const agent5Input: Agent5Input = {
      epics: body.epics,
      estimations: body.estimations,
      priorities: body.priorities,
      framework: body.framework,
      sourceWishIds: [],
      approvedAt: Date.now(),
    };

    const validation = validateAgent5Input(agent5Input);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error!, code: validation.code! },
        { status: 400 }
      );
    }

    const { stream, send, close } = createNdjsonStream();

    void (async () => {
      const emitter = new AgentStreamEmitter(send);

      try {
        const plan = await emitter.runPhase(
          'PHASE_PLAN_SPRINTS',
          'Planificando sprints',
          async () => {
            await emitter.runAction(
              'ACTION_READ_PRIORITIZED_BACKLOG',
              `Analizando ${body.epics.length} épicas priorizadas`,
              async () => undefined,
              { minVisibleMs: PREP_ACTION_MIN_VISIBLE_MS }
            );

            const result = await emitter.runAction(
              'ACTION_ASSIGN_SPRINTS',
              'Asignando historias a sprints...',
              () => planSprintsStream(uid, agent5Input, body.config, emitter.bindThought(), aiConfig)
            );

            await emitter.runAction(
              'ACTION_BUILD_SCHEDULE',
              'Generando cronograma...',
              async () => undefined,
              { minVisibleMs: PREP_ACTION_MIN_VISIBLE_MS }
            );

            return result;
          }
        );

        const response: Agent5PlanResponse = { plan };
        send({ type: 'done', payload: response });
      } catch (error) {
        console.error('[Agent 5 Plan] Stream error:', error);
        send({
          type: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Error interno en el Scrum Master IA.',
        });
      } finally {
        close();
      }
    })();

    return ndjsonStreamResponse(stream);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return Response.json(
        { error: 'No autorizado', code: 'PROCESSING_ERROR' },
        { status: 401 }
      );
    }

    if (isPlanLimitError(error)) {
      return Response.json(planErrorToJson(error), { status: 403 });
    }

    return handleApiError(error, 'Error interno del servidor.');
  }
}
