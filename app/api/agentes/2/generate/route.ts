/**
 * @fileoverview API Route — POST /api/agentes/2/generate
 *
 * Recibe los wishes y transcription vía JSON, los valida,
 * y devuelve el backlog generado con Épicas e Historias.
 */

import { type NextRequest } from 'next/server';
import { validateAgent2Input, generateBacklog } from '@/lib/services/agent-2-service';
import type { Agent2Input, Agent2GenerateResponse, Agent2ErrorResponse } from '@/lib/types/agent-2';
import { verifyRequestUser } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    await verifyRequestUser(request);

    const body = await request.json() as Agent2Input;
    
    // Validar input
    const validation = validateAgent2Input(body);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error!, code: validation.code! } satisfies Agent2ErrorResponse,
        { status: 400 }
      );
    }

    // Generar backlog
    const epics = await generateBacklog(body.wishes, body.transcription);

    // Respuesta exitosa
    const response: Agent2GenerateResponse = { epics };
    return Response.json(response, { status: 200 });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return Response.json({ error: 'No autorizado', code: 'PROCESSING_ERROR' } satisfies Agent2ErrorResponse, { status: 401 });
    }

    console.error('[Agent 2 Generate] Error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Error interno al generar el backlog. Intente de nuevo.',
        code: 'PROCESSING_ERROR',
      } satisfies Agent2ErrorResponse,
      { status: 500 }
    );
  }
}
