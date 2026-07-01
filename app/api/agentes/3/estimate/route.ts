/**
 * @fileoverview API Route — POST /api/agentes/3/estimate
 *
 * Sigue fielmente la dinámica del Agente 2 de Klarify: valida vía JSON, 
 * delega al servicio unificado de adaptadores, y emite la actividad del 
 * Scrum Master en tiempo real a través de streams NDJSON.
 */

import { type NextRequest } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { AGENT_ACTIVITY, PREP_ACTION_MIN_VISIBLE_MS } from '@/lib/constants/agent-activity';
import type { Agent3Input } from '@/lib/types/workspace';
import { validateAgent3Input, estimateBacklogStream } from '@/lib/services/agent-3-service';
import {
  AgentStreamEmitter,
  createNdjsonStream,
  ndjsonStreamResponse,
} from '@/lib/utils/llm-stream';

// Forzar a Next.js a no cachear la ruta para evaluar variables de entorno en cada petición
export const dynamic = 'force-dynamic';

// Interfaces de tipado local requeridas por el contrato de la API y el Servicio
export interface UserStory {
  id: string;
  title: string;
  description: string;
}

export interface LocalEpic {
  id: string;
  title: string;
  description?: string;
  userStories?: UserStory[];
}

export interface Agent3SuggestionItem {
  storyId: string;
  suggestedPoints: number;
  justification: string;
}

export interface Agent3EstimationResponse {
  suggestions: Agent3SuggestionItem[];
}

export async function POST(request: NextRequest) {
  
  try {
    // 1. Verificación de identidad obligatoria con Firebase Admin
    await verifyRequestUser(request);

    const body = (await request.json()) as Agent3Input;

    // 2. Validación de Entrada delegada al servicio (Idéntico al funcionamiento del Agente 2)
    const validation = validateAgent3Input(body);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error!, code: validation.code! },
        { status: 400 }
      );
    }

    // 3. Inicialización del pipeline de Streaming NDJSON de Klarify
    const { stream, send, close } = createNdjsonStream();

    void (async () => {
      const emitter = new AgentStreamEmitter(send);

      try {
        // Ejecutamos la fase usando las utilidades compartidas del flujo visual
        const suggestions = await emitter.runPhase(
          'PHASE_ESTIMATE', 
          'Estimando Esfuerzo de Desarrollo', 
          async () => {
            
            // Acción 1: Leer el backlog entrante
            await emitter.runAction(
              'ACTION_READ_BACKLOG',
              `Analizando ${body.epics.length} épicas enviadas por el Agente 2`,
              async () => undefined,
              { minVisibleMs: PREP_ACTION_MIN_VISIBLE_MS }
            );

            // Acción 2: Generar estimaciones reales o mockeadas
            // Al limpiar la función local, esto conecta directamente con el pipeline de Gemini
            return emitter.runAction(
              'ACTION_ESTIMATE_STORIES',
              'Calculando Story Points (Fibonacci)...',
              () => estimateBacklogStream(body.epics, emitter.bindThought())
            );
          }
        );

        // 4. Formatear y despachar el payload final en el evento 'done'
        const response: Agent3EstimationResponse = { suggestions };
        send({ type: 'done', payload: response });

      } catch (error) {
        console.error('[Agent 3 Estimate] Stream error:', error);
        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Error interno en el Scrum Master IA.',
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

    console.error('[Agent 3 Estimate] Critical Error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Error interno del servidor.',
        code: 'PROCESSING_ERROR',
      },
      { status: 500 }
    );
  }
}