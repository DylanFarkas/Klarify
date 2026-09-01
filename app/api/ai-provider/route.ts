/**
 * @fileoverview API Route — /api/ai-provider
 *
 * BYOK + preferencia de modelo Klarify (DeepSeek default).
 *   GET    → estado público
 *   POST   → conectar proveedor (apiKey + provider + model)
 *   PATCH  → cambiar modelo / active / provider
 *   DELETE → desconectar BYOK
 */

import { type NextRequest, NextResponse } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { handleApiError } from '@/lib/api-error';
import { isAiProviderId } from '@/lib/llm/catalog';
import {
  connectAiProvider,
  disconnectAiProvider,
  getAiProviderPublicStatus,
  updateAiProvider,
} from '@/lib/llm/resolve';
import { parseApiBody } from '@/lib/schemas/parse';
import {
  aiProviderConnectBodySchema,
  aiProviderUpdateBodySchema,
} from '@/lib/schemas/misc-api';

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const status = await getAiProviderPublicStatus(uid);
    return NextResponse.json(status);
  } catch (error) {
    return handleApiError(error, 'Error al obtener el proveedor de IA', {
      unauthorizedMessage: 'No autorizado',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = parseApiBody(aiProviderConnectBodySchema, await request.json());

    const status = await connectAiProvider(uid, {
      provider: body.provider,
      apiKey: body.apiKey,
      model: body.model,
    });

    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';

    if (message === 'AI_PROVIDER_ENCRYPTION_KEY_MISSING') {
      return NextResponse.json(
        {
          error:
            'Falta AI_PROVIDER_ENCRYPTION_KEY en el servidor. No se pueden guardar API keys.',
        },
        { status: 503 }
      );
    }

    if (message.startsWith('API_KEY_INVALID:')) {
      return NextResponse.json(
        { error: 'API key inválida o el modelo no responde. Verifica la clave.' },
        { status: 400 }
      );
    }

    return handleApiError(error, 'Error al conectar el proveedor de IA');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = parseApiBody(aiProviderUpdateBodySchema, await request.json());

    const status = await updateAiProvider(uid, {
      model: body.model,
      active: body.active,
      provider: isAiProviderId(body.provider) ? body.provider : undefined,
    });

    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';

    if (message === 'AI_PROVIDER_NOT_CONNECTED') {
      return NextResponse.json(
        { error: 'No hay proveedor BYOK conectado' },
        { status: 400 }
      );
    }
    if (message === 'INVALID_MODEL') {
      return NextResponse.json({ error: 'Modelo no válido para el proveedor' }, { status: 400 });
    }

    return handleApiError(error, 'Error al actualizar el proveedor de IA');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const status = await disconnectAiProvider(uid);
    return NextResponse.json(status);
  } catch (error) {
    return handleApiError(error, 'Error al desconectar el proveedor de IA', {
      unauthorizedMessage: 'No autorizado',
    });
  }
}
