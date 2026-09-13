/**
 * @fileoverview Adaptador multi-proveedor para el Agente 4 — Priorización.
 */

import type { IPrioritizationAdapter } from './IPrioritizationAdapter';
import type {
  LocalEpicWithEstimation,
  Agent4SuggestionItem,
  PrioritizationFramework,
  FrameworkCategory,
} from '@/lib/types/agent-4';
import {
  AGENT4_JUSTIFICATION_PREFIX,
  MAX_PRIORITIZATION_JUSTIFICATION_LENGTH,
  getFrameworkCategories,
  FRAMEWORK_DESCRIPTIONS,
} from '@/lib/constants/agent-4';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import type { AiGenerationConfig } from '@/lib/plans/types';
import { defaultAiConfig } from '@/lib/plans/ai-config';
import { generateJson } from '@/lib/llm/generate';
import type { LlmCredentials } from '@/lib/llm/types';
import { parseLlmJson } from '@/lib/schemas/llm/parse';
import {
  llmPrioritizationResponseSchema,
  llmPrioritySuggestionSchema,
} from '@/lib/schemas/llm/agent-4';

export class LlmPrioritizationAdapter implements IPrioritizationAdapter {
  constructor(private credentials: LlmCredentials) {}

  async prioritizeBacklog(
    epics: LocalEpicWithEstimation[],
    framework: PrioritizationFramework,
    aiConfig?: AiGenerationConfig
  ): Promise<Agent4SuggestionItem[]> {
    return this.prioritizeBacklogStream(epics, framework, () => {}, aiConfig);
  }

  async prioritizeBacklogStream(
    epics: LocalEpicWithEstimation[],
    framework: PrioritizationFramework,
    onThought: LLMThoughtCallback,
    aiConfig?: AiGenerationConfig
  ): Promise<Agent4SuggestionItem[]> {
    const config = aiConfig ?? defaultAiConfig();

    try {
      const { systemInstruction, userPrompt } = this.buildPrompts(epics, framework);

      const { text: responseText } = await generateJson(this.credentials, {
        systemInstruction,
        userPrompt,
        temperature: 0.1,
        thinkingBudget: config.thinkingBudget,
        onThought,
      });

      return this.parsePrioritizationResponse(responseText, framework);
    } catch (error) {
      console.error('[LlmPrioritizationAdapter] Error al priorizar backlog:', error);
      throw new Error(
        `Error en el servicio de priorización: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  private buildPrompts(
    epics: LocalEpicWithEstimation[],
    framework: PrioritizationFramework
  ): { systemInstruction: string; userPrompt: string } {
    const validCategories = getFrameworkCategories(framework);
    const frameworkInfo = FRAMEWORK_DESCRIPTIONS[framework];

    const systemInstruction = `Devuelve la respuesta estrictamente como un objeto JSON con la siguiente forma exacta. No incluyas markdown, bloques de código (\`\`\`json) ni ningún texto extra — solo el JSON puro.

{
  "suggestions": [
    {
      "storyId": "ID-DE-LA-HISTORIA",
      "suggestedCategory": "${validCategories[0]}",
      "justification": "Explicación concisa del valor de negocio."
    }
  ]
}

REGLAS CRÍTICAS:
- 'suggestedCategory' debe ser exactamente uno de: ${validCategories.join(', ')}.
- Evalúa el valor de negocio, dependencias, riesgo y esfuerzo estimado de cada historia.
- La justificación debe ser clara y profesional (máximo ${MAX_PRIORITIZATION_JUSTIFICATION_LENGTH} caracteres).
- Prioriza solo cada historia (storyId HU-XXX / BUG-XXX / TASK-XXX). Las subtareas son contexto: no emitas categorías por subtarea.`;

    const userPrompt = `Eres un Product Owner experto en priorización ágil usando la metodología ${frameworkInfo.label}.

METODOLOGÍA: ${frameworkInfo.label}
DESCRIPCIÓN: ${frameworkInfo.summary}
DETALLES: ${frameworkInfo.details}

A partir del siguiente backlog estructurado y estimado (effortLabel = Story Points o tiempo), clasifica cada historia de usuario en una de las siguientes categorías: ${validCategories.join(', ')}.

BACKLOG A PRIORIZAR:
${JSON.stringify(epics, null, 2)}`;

    return { systemInstruction, userPrompt };
  }

  private parsePrioritizationResponse(
    responseText: string,
    framework: PrioritizationFramework
  ): Agent4SuggestionItem[] {
    const raw = parseLlmJson(
      responseText,
      llmPrioritizationResponseSchema,
      'Gemini no devolvió un objeto con la forma { suggestions: SuggestionItem[] }'
    );

    const validCategories = getFrameworkCategories(framework);

    return raw.suggestions
      .map((sug) => llmPrioritySuggestionSchema.safeParse(sug))
      .filter((result) => result.success)
      .map((result) => result.data)
      .filter((sug) => validCategories.includes(sug.suggestedCategory))
      .map((sug) => ({
        storyId: sug.storyId.trim(),
        suggestedCategory: sug.suggestedCategory as FrameworkCategory,
        justification: `${AGENT4_JUSTIFICATION_PREFIX} ${sug.justification.trim()}`,
      }));
  }
}
