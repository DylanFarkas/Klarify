/**
 * @fileoverview Adaptador multi-proveedor para generación de backlog (Agente 2).
 */

import { IBacklogLLMAdapter } from './IBacklogLLMAdapter';
import type { Wish, TranscriptionResult } from '@/lib/types/agent-1';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import { MAX_SUBTASKS_PER_STORY } from '@/lib/constants/agent-2';
import { assignSubtaskIds, generateEpicId, generateUserStoryId } from '@/lib/utils/agent-2-ids';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import type { AiGenerationConfig } from '@/lib/plans/types';
import { backlogDetailPrompt, defaultAiConfig } from '@/lib/plans/ai-config';
import { generateJson } from '@/lib/llm/generate';
import type { LlmCredentials } from '@/lib/llm/types';

interface RawBacklogResponse {
  epics: Array<{
    title: string;
    description: string;
    userStories: Array<{
      title: string;
      description: string;
      acceptanceCriteria: string[];
      sourceWishIds: string[];
      subtasks?: unknown;
    }>;
  }>;
}

export class LlmBacklogAdapter implements IBacklogLLMAdapter {
  constructor(private credentials: LlmCredentials) {}

  async generateBacklog(
    wishes: Wish[],
    transcription?: TranscriptionResult | null,
    aiConfig?: AiGenerationConfig
  ): Promise<Epic[]> {
    return this.generateBacklogStream(wishes, () => {}, transcription, aiConfig);
  }

  async generateBacklogStream(
    wishes: Wish[],
    onThought: LLMThoughtCallback,
    transcription?: TranscriptionResult | null,
    aiConfig?: AiGenerationConfig
  ): Promise<Epic[]> {
    try {
      const config = aiConfig ?? defaultAiConfig();
      const { systemInstruction, userPrompt } = this.buildPrompts(wishes, transcription, config);

      const { text: responseText } = await generateJson(this.credentials, {
        systemInstruction,
        userPrompt,
        temperature: 0.2,
        thinkingBudget: config.thinkingBudget,
        onThought,
      });

      return this.parseBacklogResponse(responseText);
    } catch (error) {
      console.error('[LlmBacklogAdapter] Error al generar backlog:', error);
      throw new Error(
        `Error en el servicio de generación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  private buildPrompts(
    wishes: Wish[],
    transcription: TranscriptionResult | null | undefined,
    config: AiGenerationConfig
  ): { systemInstruction: string; userPrompt: string } {
    const detailHint = backlogDetailPrompt(config.backlogDetail);

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
          "sourceWishIds": ["DESEO-001"],
          "subtasks": [
            "Implementar el flujo principal descrito en los criterios",
            "Cubrir el caso de error cuando falte un dato obligatorio"
          ]
        }
      ]
    }
  ]
}

REGLAS CRÍTICAS:
- NO incluyas campos "id", "source", "isEdited", "createdAt" ni "done" en ningún objeto. Estos campos serán generados por el sistema después.
- Genera como máximo ${config.maxEpics} épicas y como máximo ${config.maxStories} historias en total.
- Cada épica debe tener entre 1 y ${config.maxStoriesPerEpic} historias de usuario.
- Cada historia debe tener entre 1 y 5 criterios de aceptación.
- Cada historia debe incluir al menos un elemento en sourceWishIds referenciando un ID de deseo válido.
- subtasks es un array de strings (solo el título). Máximo ${MAX_SUBTASKS_PER_STORY} por historia. 0 es válido si no hace falta desglose.
- ${detailHint}`;

    const userPrompt = `Eres un Product Owner experto en gestión ágil de proyectos.
A partir de los siguientes deseos aprobados por el cliente, genera un backlog estructurado con Épicas e Historias de Usuario.

REGLAS:
1. Agrupa los deseos relacionados en Épicas temáticas (máximo ${config.maxEpics} épicas).
2. Cada Épica agrupa 1-${config.maxStoriesPerEpic} Historias de Usuario relacionadas.
3. El total de historias no debe superar ${config.maxStories}.
4. Formato estándar de HU: "Como [rol], quiero [acción] para [beneficio]".
5. Los criterios de aceptación deben ser verificables (formato dado/cuando/entonces o checklist).
6. En sourceWishIds, referencia los IDs exactos de los deseos que originaron cada HU (ej: "DESEO-001").
7. Si hay transcripción de la reunión, úsala como contexto adicional para enriquecer las HU.
8. Tras definir cada HU y sus criterios, genera únicamente las subtareas necesarias para implementarla y validarla por completo.
9. Subtareas: concretas, accionables y verificables; empiezan con un verbo de acción; técnicas cuando corresponda; alcance manejable sin micro-dividir.
10. Cada subtarea debe ser trazable a los criterios de aceptación existentes. No inventes requisitos, detalles de implementación innecesarios ni funcionalidades nuevas.
11. Cuando aplique, considera desarrollo, integración, validaciones, manejo de errores y pruebas. No dupliques subtareas ni fuerces una cantidad fija. Si la HU es trivial, 1-2; si no hace falta desglose, usa [].
12. ${detailHint}

DESEOS APROBADOS:
${wishes.map((w) => `- ${w.id}: ${w.text}`).join('\n')}
${transcription ? `\nTRANSCRIPCIÓN DE LA REUNIÓN:\n"""\n${transcription.fullText}\n"""` : ''}`;

    return { systemInstruction, userPrompt };
  }

  private parseBacklogResponse(responseText: string): Epic[] {
    const raw = JSON.parse(responseText) as RawBacklogResponse;

    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.epics)) {
      throw new Error('Gemini no devolvió un objeto con la forma { epics: Epic[] }');
    }

    const validEpics: { rawEpic: RawBacklogResponse['epics'][number]; validStories: UserStory[] }[] = [];

    for (const rawEpic of raw.epics) {
      if (
        !rawEpic ||
        typeof rawEpic !== 'object' ||
        typeof rawEpic.title !== 'string' ||
        rawEpic.title.trim().length === 0 ||
        typeof rawEpic.description !== 'string' ||
        !Array.isArray(rawEpic.userStories)
      ) {
        console.warn('[LlmBacklogAdapter] Épica inválida descartada:', rawEpic?.title ?? rawEpic);
        continue;
      }

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
          console.warn('[LlmBacklogAdapter] Historia inválida descartada:', rawStory?.title ?? rawStory);
          continue;
        }

        const cleanCriteria = rawStory.acceptanceCriteria
          .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
          .map((c) => c.trim());

        if (cleanCriteria.length === 0) {
          console.warn('[LlmBacklogAdapter] Historia descartada (sin criterios válidos):', rawStory.title);
          continue;
        }

        const rawSubtasks = Array.isArray(rawStory.subtasks) ? rawStory.subtasks : [];
        const cleanSubtaskTitles = rawSubtasks
          .map(extractSubtaskTitle)
          .filter((title): title is string => Boolean(title))
          .slice(0, MAX_SUBTASKS_PER_STORY);

        validStories.push({
          id: '',
          type: 'story',
          title: rawStory.title.trim(),
          description: rawStory.description.trim(),
          acceptanceCriteria: cleanCriteria,
          subtasks: assignSubtaskIds(cleanSubtaskTitles),
          sourceWishIds: rawStory.sourceWishIds,
          source: 'auto',
          isEdited: false,
          createdAt: Date.now(),
        });
      }

      if (validStories.length > 0) {
        validEpics.push({ rawEpic, validStories });
      }
    }

    if (validEpics.length === 0) {
      throw new Error('Gemini devolvió 0 épicas válidas tras validación');
    }

    const allValidStories: UserStory[] = [];
    const result: Epic[] = [];

    for (const { rawEpic, validStories } of validEpics) {
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

    return result;
  }
}

function extractSubtaskTitle(item: unknown): string | null {
  if (typeof item === 'string') {
    const title = item.trim();
    return title.length > 0 ? title : null;
  }
  if (item && typeof item === 'object' && 'title' in item) {
    const title = (item as { title?: unknown }).title;
    if (typeof title === 'string' && title.trim()) return title.trim();
  }
  return null;
}
