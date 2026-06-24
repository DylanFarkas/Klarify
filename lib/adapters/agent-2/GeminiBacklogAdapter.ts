/**
 * @fileoverview Adaptador Gemini para la generación de backlog (Fase 3).
 *
 * Utiliza el SDK @google/genai para generar Épicas e Historias de Usuario
 * a partir de los deseos aprobados del cliente. Se fuerza el formato de
 * salida a JSON para facilitar el parseo.
 *
 * Patrón replicado de GeminiLLMAdapter.ts (Agente 1):
 * - Mismo SDK, modelo, config, y estructura de error handling.
 * - El adaptador es responsable de asignar IDs y metadata.
 */

import { GoogleGenAI } from '@google/genai';
import { IBacklogLLMAdapter } from './IBacklogLLMAdapter';
import type { Wish, TranscriptionResult } from '@/lib/types/agent-1';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import { generateEpicId, generateUserStoryId } from '@/lib/services/agent-2-service';

export class GeminiBacklogAdapter implements IBacklogLLMAdapter {
  private ai: GoogleGenAI | null = null;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
  }

  async generateBacklog(wishes: Wish[], transcription?: TranscriptionResult | null): Promise<Epic[]> {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
    }

    try {
      console.log('[GeminiBacklogAdapter] Iniciando generación de backlog con Gemini...');

      // ── Construir prompt ───────────────────────────────────────
      const systemInstruction = `Devuelve la respuesta estrictamente como un objeto JSON con la siguiente forma exacta. No incluyas markdown, bloques de código ni ningún texto extra — solo el JSON puro.

{
  "epics": [
    {
      "title": "Título de la Épica",
      "description": "Descripción de la Épica",
      "userStories": [
        {
          "title": "Título de la Historia",
          "description": "Como [rol], quiero [acción] para [beneficio]",
          "acceptanceCriteria": [
            "Criterio 1 en formato dado/cuando/entonces",
            "Criterio 2"
          ],
          "sourceWishIds": ["DESEO-001"]
        }
      ]
    }
  ]
}

REGLAS CRÍTICAS:
- NO incluyas campos "id", "source", "isEdited" ni "createdAt" en ningún objeto. Estos campos serán generados por el sistema después.
- Cada épica debe tener entre 1 y 5 historias de usuario.
- Cada historia debe tener entre 1 y 5 criterios de aceptación.
- Cada historia debe incluir al menos un elemento en sourceWishIds referenciando un ID de deseo válido.
- Agrupa los deseos relacionados en épicas temáticas (típicamente 3-7 épicas).`;

      const userPrompt = `Eres un Product Owner experto en gestión ágil de proyectos.
A partir de los siguientes deseos aprobados por el cliente, genera un backlog estructurado con Épicas e Historias de Usuario.

REGLAS:
1. Agrupa los deseos relacionados en Épicas temáticas (típicamente 3-7 épicas).
2. Cada Épica agrupa 1-5 Historias de Usuario relacionadas.
3. Formato estándar de HU: "Como [rol], quiero [acción] para [beneficio]".
4. Los criterios de aceptación deben ser verificables (formato dado/cuando/entonces o checklist).
5. En sourceWishIds, referencia los IDs exactos de los deseos que originaron cada HU (ej: "DESEO-001").
6. Si hay transcripción de la reunión, úsala como contexto adicional para enriquecer las HU.

DESEOS APROBADOS:
${wishes.map((w) => `- ${w.id}: ${w.text}`).join('\n')}
${transcription ? `\nTRANSCRIPCIÓN DE LA REUNIÓN:\n"""\n${transcription.fullText}\n"""` : ''}`;

      // ── Llamar a Gemini ────────────────────────────────────────
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      // ── Nivel 0: response.text null check ──────────────────────
      const responseText = response.text;
      if (!responseText) {
        throw new Error('Respuesta vacía de Gemini');
      }

      // ── Nivel 1: JSON.parse ────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = JSON.parse(responseText);

      // ── Nivel 2: Top-level shape ───────────────────────────────
      if (!raw || typeof raw !== 'object' || !Array.isArray(raw.epics)) {
        throw new Error('Gemini no devolvió un objeto con la forma { epics: Epic[] }');
      }

      // ── Nivel 3 + 4: Validar épicos e historias, filtrar inválidos ─
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validEpics: { rawEpic: any; validStories: UserStory[] }[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const rawEpic of raw.epics) {
        // Validación a nivel de épica
        if (
          !rawEpic ||
          typeof rawEpic !== 'object' ||
          typeof rawEpic.title !== 'string' ||
          rawEpic.title.trim().length === 0 ||
          typeof rawEpic.description !== 'string' ||
          !Array.isArray(rawEpic.userStories)
        ) {
          console.warn('[GeminiBacklogAdapter] Épica inválida descartada:', rawEpic?.title ?? rawEpic);
          continue;
        }

        // Validación a nivel de historia dentro de esta épica
        const validStories: UserStory[] = [];
        for (const rawStory of rawEpic.userStories) {
          if (
            !rawStory ||
            typeof rawStory !== 'object' ||
            typeof rawStory.title !== 'string' ||
            rawStory.title.trim().length === 0 ||
            typeof rawStory.description !== 'string' ||
            rawStory.description.trim().length === 0 ||
            !Array.isArray(rawStory.acceptanceCriteria) ||
            rawStory.acceptanceCriteria.length < 1 ||
            !Array.isArray(rawStory.sourceWishIds)
          ) {
            console.warn('[GeminiBacklogAdapter] Historia inválida descartada:', rawStory?.title ?? rawStory);
            continue;
          }

          // Filtrar criterios vacíos
          const cleanCriteria = rawStory.acceptanceCriteria
            .filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0)
            .map((c: string) => c.trim());

          if (cleanCriteria.length === 0) {
            console.warn('[GeminiBacklogAdapter] Historia descartada (sin criterios válidos):', rawStory.title);
            continue;
          }

          validStories.push({
            id: '', // Se asigna después
            title: rawStory.title.trim(),
            description: rawStory.description.trim(),
            acceptanceCriteria: cleanCriteria,
            sourceWishIds: rawStory.sourceWishIds,
            source: 'auto',
            isEdited: false,
            createdAt: Date.now(),
          });
        }

        // Solo conservar épicas que tengan al menos 1 historia válida
        if (validStories.length > 0) {
          validEpics.push({ rawEpic, validStories });
        }
      }

      // ── Nivel 5: Resultado vacío ───────────────────────────────
      if (validEpics.length === 0) {
        throw new Error('Gemini devolvió 0 épicas válidas tras validación');
      }

      // ── Nivel 6: Asignar IDs y metadata ────────────────────────
      // IDs secuenciales a lo largo de todo el backlog (no por épica)
      const allValidStories: UserStory[] = [];
      const result: Epic[] = [];

      for (const { rawEpic, validStories } of validEpics) {
        // Asignar IDs a las historias de esta épica
        for (const story of validStories) {
          story.id = generateUserStoryId(allValidStories);
          allValidStories.push(story);
        }

        result.push({
          id: generateEpicId(result),
          title: rawEpic.title.trim(),
          description: rawEpic.description.trim(),
          userStories: validStories,
          source: 'auto',
          isEdited: false,
          createdAt: Date.now(),
        });
      }

      console.log(`[GeminiBacklogAdapter] Generación exitosa. Épicas: ${result.length}, Historias: ${allValidStories.length}`);
      return result;

    } catch (error) {
      console.error('[GeminiBacklogAdapter] Error al generar backlog:', error);
      throw new Error(`Error en el servicio de generación (Gemini): ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}
