/**
 * @fileoverview API Route — POST /api/agentes/4/prioritize
 *
 * Sigue la dinámica del Agente 3 de Klarify: valida vía JSON,
 * delega al servicio de priorización, y emite la actividad del
 * Product Owner en tiempo real a través de streams NDJSON.
 */

import { type NextRequest } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
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

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificación de identidad obligatoria con Firebase Admin
    await verifyRequestUser(request);

    const body = (await request.json()) as Agent4PrioritizeRequest;

    // 2. Construir Agent4Input temporal para validar
    const agent4Input: Agent4Input = {
      epics: body.epics,
      estimations: body.estimations,
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
                  agent4Input,
                  body.framework ?? 'moscow',
                  emitter.bindThought()
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

    console.error('[Agent 4 Prioritize] Critical Error:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Error interno del servidor.',
        code: 'PROCESSING_ERROR',
      },
      { status: 500 }
    );
  }
}
