/**
 * @fileoverview API Route — POST /api/agentes/1/upload
 *
 * Recibe un archivo vía FormData, lo valida (tipo + tamaño),
 * y devuelve la transcripción + deseos extraídos.
 *
 * Actualmente usa el servicio mock. Cuando se integre el backend real,
 * solo cambian las funciones en `lib/services/agent-1-service.ts`.
 */

import { type NextRequest } from 'next/server';
import { validateFile, processFile, extractWishes } from '@/lib/services/agent-1-service';
import type { Agent1UploadResponse, Agent1ErrorResponse } from '@/lib/types/agent-1';

export async function POST(request: NextRequest) {
  try {
    // 1. Parsear FormData
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: 'No se recibió ningún archivo.', code: 'INVALID_TYPE' } satisfies Agent1ErrorResponse,
        { status: 400 }
      );
    }

    // 2. Validar archivo (tipo + tamaño según CA1)
    const validation = validateFile(file.name, file.size, file.type);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error!, code: validation.code! } satisfies Agent1ErrorResponse,
        { status: 400 }
      );
    }

    // 3. Procesar: transcripción + extracción de deseos
    const transcription = await processFile(file);
    const wishes = await extractWishes(transcription);

    // 4. Respuesta exitosa
    const response: Agent1UploadResponse = { transcription, wishes };
    return Response.json(response, { status: 200 });

  } catch (error) {
    console.error('[Agent 1 Upload] Error:', error);
    return Response.json(
      {
        error: 'Error interno al procesar el archivo. Intente de nuevo.',
        code: 'PROCESSING_ERROR',
      } satisfies Agent1ErrorResponse,
      { status: 500 }
    );
  }
}
