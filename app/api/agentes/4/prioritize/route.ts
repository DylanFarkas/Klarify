/**
 * @fileoverview API Route — POST /api/agentes/4/prioritize
 *
 * Sigue la dinámica del Agente 3 de Klarify: valida vía JSON,
 * delega al servicio de priorización, y emite la actividad del
 * Product Owner en tiempo real a través de streams NDJSON.
 */

import { type NextRequest } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { getAiConfig, resolveUserPlan } from '@/lib/plans/plan-service';
import { assertAiRegenerationAllowed } from '@/lib/plans/regeneration-guard';
import { isPlanLimitError, planErrorToJson } from '@/lib/plans/plan-errors';
import { PREP_ACTION_MIN_VISIBLE_MS } from '@/lib/constants/agent-activity';
import { FRAMEWORK_DESCRIPTIONS } from '@/lib/constants/agent-4';
import type { Agent4Input } from '@/lib/types/workspace';
import {
  validateAgent4Input,
  prioritizeBacklogStream,
} from '@/lib/services/agent-4-service';
import {
  AgentStreamEmitter,
  createNdjsonStream,
  ndjsonStreamResponse,
} from '@/lib/utils/llm-stream';
import type {
  Agent4PrioritizationResponse,
  Agent4PrioritizeRequest,
} from '@/lib/types/agent-4';
import { handleApiError } from '@/lib/api-error';
import { parseApiBody } from '@/lib/schemas/parse';
import { agent4PrioritizeBodySchema } from '@/lib/schemas/agent-inputs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = parseApiBody(
      agent4PrioritizeBodySchema,
      await request.json()
    ) as Agent4PrioritizeRequest & { isRegeneration?: boolean };

    await assertAiRegenerationAllowed(uid, 'agent4', body.isRegeneration);
    const aiConfig = getAiConfig((await resolveUserPlan(uid)).id);

    // 2. Construir Agent4Input temporal para validar
    const agent4Input: Agent4Input = {
      epics: body.epics,
      estimations: body.estimations,
      estimationMode: body.estimationMode ?? 'story_points',
      sourceWishIds: [],
      approvedAt: Date.now(),
    };

    // 3. Validación de entrada delegada al servicio
    const validation = validateAgent4Input(agent4Input);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error!, code: validation.code! },
        { status: 400 }
      );
    }

    // 4. Inicialización del pipeline de Streaming NDJSON
    const { stream, send, close } = createNdjsonStream();

    void (async () => {
      const emitter = new AgentStreamEmitter(send);

      try {
        const suggestions = await emitter.runPhase(
          'PHASE_PRIORITIZE',
          'Priorizando backlog',
          async () => {
            // Acción 1: Leer el backlog entrante
            await emitter.runAction(
              'ACTION_READ_BACKLOG',
              `Analizando ${agent4Input.epics.length} épicas con estimaciones`,
              async () => undefined,
              { minVisibleMs: PREP_ACTION_MIN_VISIBLE_MS }
            );

            // Acción 2: Generar priorizaciones reales o mockeadas
            const selectedFramework = body.framework ?? 'moscow';
            const frameworkLabel = FRAMEWORK_DESCRIPTIONS[selectedFramework].label;
            return emitter.runAction(
              'ACTION_PRIORITIZE_STORIES',
              `Clasificando historias (${frameworkLabel})...`,
              () =>
                prioritizeBacklogStream(
                  uid,
                  agent4Input,
                  body.framework ?? 'moscow',
                  emitter.bindThought(),
                  aiConfig
                )
            );
          }
        );

        // 5. Formatear y despachar el payload final
        const response: Agent4PrioritizationResponse = { suggestions };
        send({ type: 'done', payload: response });
      } catch (error) {
        console.error('[Agent 4 Prioritize] Stream error:', error);
        send({
          type: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Error interno en el Product Owner IA.',
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
