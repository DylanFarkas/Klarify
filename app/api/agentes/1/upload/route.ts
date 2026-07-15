/**
 * @fileoverview API Route — POST /api/agentes/1/upload
 *
 * Recibe un archivo vía FormData, lo valida (tipo + tamaño),
 * y devuelve únicamente la transcripción. La evaluación de contexto
 * y extracción de deseos ocurren en /analyze y /extract.
 */

import { type NextRequest } from 'next/server';
import { ENABLE_FILE_UPLOAD } from '@/lib/constants/agent-1';
import { validateFile, processFile, processText } from '@/lib/services/agent-1-service';
import type { Agent1UploadResponse, Agent1ErrorResponse } from '@/lib/types/agent-1';
import { verifyRequestUser } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    await verifyRequestUser(request);

    const formData = await request.formData();
    const file = formData.get('file');
    const text = formData.get('text');

    let transcription;

    if (text && typeof text === 'string') {
      transcription = processText(text);
    } else if (file && file instanceof File) {
      if (!ENABLE_FILE_UPLOAD) {
        return Response.json(
          { error: 'La carga de archivos no está disponible por el momento.', code: 'INVALID_TYPE' } satisfies Agent1ErrorResponse,
          { status: 403 }
        );
      }
      const validation = validateFile(file.name, file.size, file.type);
      if (!validation.valid) {
        return Response.json(
          { error: validation.error!, code: validation.code! } satisfies Agent1ErrorResponse,
          { status: 400 }
        );
      }
      transcription = await processFile(file);
    } else {
      return Response.json(
        { error: 'No se recibió ni un archivo ni un texto.', code: 'INVALID_TYPE' } satisfies Agent1ErrorResponse,
        { status: 400 }
      );
    }

    const response: Agent1UploadResponse = { transcription };
    return Response.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return Response.json({ error: 'No autorizado', code: 'PROCESSING_ERROR' } satisfies Agent1ErrorResponse, { status: 401 });
    }

    console.error('[Agent 1 Upload] Error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Error interno al procesar el archivo. Intente de nuevo.',
        code: 'PROCESSING_ERROR',
      } satisfies Agent1ErrorResponse,
      { status: 500 }
    );
  }
}
