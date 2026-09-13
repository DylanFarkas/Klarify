/**
 * @fileoverview Adaptador LLM para recomendación de stack tecnológico.
 */

import { getCatalogIdsForPrompt } from '@/lib/constants/tech-catalog';
import { generateJson } from '@/lib/llm/generate';
import type { LlmCredentials } from '@/lib/llm/types';
import type { StackRecommendRaw } from '@/lib/types/stack';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import { parseLlmJson, tryParseLlmJson } from '@/lib/schemas/llm/parse';
import { llmStackRecommendSchema } from '@/lib/schemas/llm/stack';

export interface StackRecommendContext {
  projectSummary: string;
  wishesText: string;
  enrichedContext: string;
  backlogSummary: string;
  layerGuidance?: string;
}

export class LlmStackAdapter {
  constructor(private credentials: LlmCredentials) {}

  async recommendStack(
    context: StackRecommendContext,
    onThought: LLMThoughtCallback
  ): Promise<StackRecommendRaw> {
    const { systemInstruction, userPrompt } = this.buildPrompts(context);

    const { text } = await generateJson(this.credentials, {
      systemInstruction,
      userPrompt,
      temperature: 0.25,
      thinkingBudget: 1024,
      onThought,
    });

    return this.parseResponse(text);
  }

  private buildPrompts(context: StackRecommendContext): {
    systemInstruction: string;
    userPrompt: string;
  } {
    const catalogBlock = getCatalogIdsForPrompt();

    const systemInstruction = `Eres un arquitecto de software senior. Recomiendas stacks tecnológicos coherentes para proyectos reales.

Devuelve SOLO JSON válido (sin markdown) con esta forma exacta:
{
  "productKind": "string — tipo de producto (ej. SaaS B2B, marketplace, app mobile)",
  "architecturePattern": "string — patrón (ej. monolito modular, microservicios, JAMstack, serverless)",
  "layers": {
    "frontend": [{ "catalogId": "nextjs", "isPrimary": true }, { "catalogId": "typescript" }],
    "backend": [{ "catalogId": "nodejs", "isPrimary": true }],
    "database": [{ "catalogId": "postgresql", "isPrimary": true }],
    "auth": [{ "catalogId": "clerk" }],
    "hosting": [{ "catalogId": "vercel" }]
  },
  "rationale": "string — 2-4 párrafos justificando el stack con el backlog y el contexto del proyecto"
}

REGLAS ESTRICTAS:
- Usa SOLO catalogId del catálogo provisto O customName si no existe (evita custom si hay ID).
- Una tecnología por ítem: NUNCA combines varias en un customName ("React + TypeScript" está prohibido). Usa entradas separadas: [{ "catalogId": "react", "isPrimary": true }, { "catalogId": "typescript" }].
- customName solo para tecnologías que NO están en el catálogo (ej. "JWT + bcrypt"); no lo uses si cada parte tiene catalogId.
- Supabase: usa supabase-baas, supabase-auth, supabase-db, supabase-realtime, supabase-edge-functions, supabase (hosting) según la capa — nunca "Supabase Auth (JWT + bcrypt)" ni "Supabase Edge Functions (Deno)" como customName.
- Una sola tecnología primaria (isPrimary: true) por capa frontend, backend y database.
- El stack debe encajar con el backlog, deseos y restricciones del proyecto.
- No mezcles alternativas incompatibles (React + Vue como primarios; Flutter + React Native nativos).
- Basa la recomendación en el catálogo, el backlog y buenas prácticas actuales (2024-2026).
- Incluye capas relevantes: frontend, backend, database casi siempre; auth, hosting, styling si aplica.
- NO incluyas capas especializadas (realtime, payments, cms, messaging, storage, monitoring, devops, mobile) salvo que el contexto del proyecto las justifique claramente.
- layers usa claves: frontend, backend, database, auth, hosting, styling, orm, realtime, storage, testing, payments, mobile, cms, messaging, monitoring, devops.
- NO incluyas campo "sources" ni "researchQueries".

CATÁLOGO (catalogId → nombre, capa):
${catalogBlock}`;

    const layerBlock = context.layerGuidance?.trim()
      ? `\n## Capas permitidas para este proyecto\n${context.layerGuidance.trim()}\n`
      : '';

    const userPrompt = `## Resumen del proyecto
${context.projectSummary}

## Deseos del cliente
${context.wishesText || '(sin deseos)'}

## Contexto enriquecido / discovery
${context.enrichedContext || '(sin contexto adicional)'}

## Backlog (épicas e historias)
${context.backlogSummary}
${layerBlock}
Recomienda el stack tecnológico más adecuado para implementar este proyecto. Solo incluye capas justificadas por el backlog.`;

    return { systemInstruction, userPrompt };
  }

  private parseResponse(text: string): StackRecommendRaw {
    let parsed = tryParseLlmJson(text, llmStackRecommendSchema);
    if (!parsed) {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Respuesta del LLM no es JSON válido');
      parsed = parseLlmJson(match[0], llmStackRecommendSchema, 'JSON de stack incompleto');
    }

    return {
      ...parsed,
      layers: parsed.layers as StackRecommendRaw['layers'],
      rationale: parsed.rationale ?? '',
    };
  }
}

/** Fallback cuando no hay credenciales LLM configuradas. */
export class MockStackAdapter {
  async recommendStack(
    context: StackRecommendContext,
    onThought: LLMThoughtCallback
  ): Promise<StackRecommendRaw> {
    await onThought('Analizando backlog y contexto del proyecto…');
    await onThought('Componiendo stack de referencia (modo demo sin LLM)…');

    const combined = `${context.backlogSummary}\n${context.wishesText}\n${context.enrichedContext}`;
    const isMobile = /mobile|app nativ|ios|android/i.test(combined);
    const needsRealtime = /multijugador|tiempo real|websocket|socket|online play|live/i.test(combined);

    if (isMobile) {
      const layers: StackRecommendRaw['layers'] = {
        mobile: [{ catalogId: 'react-native', isPrimary: true }, { catalogId: 'expo' }],
        backend: [{ catalogId: 'nestjs', isPrimary: true }],
        database: [{ catalogId: 'postgresql', isPrimary: true }],
        auth: [{ catalogId: 'firebase-auth' }],
        hosting: [{ catalogId: 'firebase' }],
      };
      if (needsRealtime) {
        layers.realtime = [{ catalogId: 'socket-io' }];
      }
      return {
        productKind: 'Aplicación mobile cross-platform',
        architecturePattern: 'Cliente mobile + API backend',
        layers,
        rationale:
          'Stack mobile con React Native y Expo para iteración rápida, NestJS como API y PostgreSQL para datos relacionales. Ajusta según tu backlog real cuando conectes un proveedor de IA.',
      };
    }

    return {
      productKind: 'SaaS web',
      architecturePattern: 'Monolito modular full-stack',
      layers: {
        frontend: [
          { catalogId: 'nextjs', isPrimary: true },
          { catalogId: 'typescript' },
          { catalogId: 'tailwindcss' },
        ],
        backend: [{ catalogId: 'nodejs', isPrimary: true }],
        database: [{ catalogId: 'postgresql', isPrimary: true }],
        auth: [{ catalogId: 'clerk' }],
        hosting: [{ catalogId: 'vercel' }],
        orm: [{ catalogId: 'prisma' }],
        testing: [{ catalogId: 'playwright' }],
      },
      rationale:
        'Stack moderno para SaaS: Next.js con TypeScript y Tailwind, Node.js, PostgreSQL y Prisma. Vercel para despliegue y Clerk para auth. Recomendación demo — conecta tu proveedor de IA para personalizar según el backlog.',
    };
  }
}
