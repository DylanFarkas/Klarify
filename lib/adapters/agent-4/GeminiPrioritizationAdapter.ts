/**
 * @fileoverview Adaptador de Gemini para el Agente 4 — Product Owner (Priorización).
 * Utiliza el SDK @google/genai para clasificar historias en categorías MoSCoW.
 * Soporta streaming nativo de pensamientos del modelo vía generateContentStream.
 */

import { GoogleGenAI } from '@google/genai';
import type { IPrioritizationAdapter } from './IPrioritizationAdapter';
import type {
  LocalEpicWithEstimation,
  Agent4SuggestionItem,
  PrioritizationFramework,
  FrameworkCategory,
} from '@/lib/types/agent-4';
import {
  GEMINI_PRIORITIZATION_PREFIX,
  MAX_PRIORITIZATION_JUSTIFICATION_LENGTH,
  getFrameworkCategories,
  FRAMEWORK_DESCRIPTIONS,
} from '@/lib/constants/agent-4';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import type { AiGenerationConfig } from '@/lib/plans/types';
import { defaultAiConfig } from '@/lib/plans/ai-config';

interface ContentPart {
  text?: string;
  thought?: boolean;
}

interface RawPrioritizationResponse {
  suggestions: Array<{
    storyId: string;
    suggestedCategory: string;
    justification: string;
  }>;
}



export class GeminiPrioritizationAdapter implements IPrioritizationAdapter {
  private ai: GoogleGenAI | null = null;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
  }

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
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
    }

    try {
      console.log('[GeminiPrioritizationAdapter] Iniciando análisis de priorización con Gemini...');

      const { systemInstruction, userPrompt } = this.buildPrompts(epics, framework);

      const responseText = await this.streamGenerate(
        userPrompt,
        systemInstruction,
        onThought,
        config.thinkingBudget
      );

      if (!responseText) {
        throw new Error('Respuesta vacía de Gemini al priorizar.');
      }
      console.log('📋 [GEMINI RESPONSE RAW]:', responseText);
      const result = this.parsePrioritizationResponse(responseText, framework);
      console.log(
        `[GeminiPrioritizationAdapter] Priorización exitosa. Historias procesadas: ${result.length}`
      );

      return result;
    } catch (error) {
      console.error('[GeminiPrioritizationAdapter] Error al priorizar backlog:', error);
      throw new Error(
        `Error en el servicio de priorización (Gemini): ${error instanceof Error ? error.message : 'Error desconocido'}`
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
- Evalúa el valor de negocio, dependencias, riesgo y esfuerzo (Story Points) de cada historia.
- La justificación debe ser clara y profesional (máximo ${MAX_PRIORITIZATION_JUSTIFICATION_LENGTH} caracteres).`;

    const userPrompt = `Eres un Product Owner experto en priorización ágil usando la metodología ${frameworkInfo.label}.

METODOLOGÍA: ${frameworkInfo.label}
DESCRIPCIÓN: ${frameworkInfo.summary}
DETALLES: ${frameworkInfo.details}

A partir del siguiente backlog estructurado y estimado en Story Points, clasifica cada historia de usuario en una de las siguientes categorías: ${validCategories.join(', ')}.

BACKLOG A PRIORIZAR:
${JSON.stringify(epics, null, 2)}`;

    return { systemInstruction, userPrompt };
  }

  private async streamGenerate(
    contents: string,
    systemInstruction: string,
    onThought: LLMThoughtCallback,
    thinkingBudget: number
  ): Promise<string> {
    if (!this.ai) throw new Error('SDK no inicializado.');

    const responseStream = await this.ai.models.generateContentStream({
      model: this.modelName,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget,
        },
      },
    });

    let outputText = '';

    for await (const chunk of responseStream) {
      const parts = (chunk.candidates?.[0]?.content?.parts ?? []) as ContentPart[];

      for (const part of parts) {
        if (typeof part.text !== 'string') continue;

        if (part.thought === true) {
          onThought(part.text);
        } else {
          outputText += part.text;
        }
      }
    }

    return outputText;
  }

  private parsePrioritizationResponse(
    responseText: string,
    framework: PrioritizationFramework
  ): Agent4SuggestionItem[] {
    const raw = JSON.parse(responseText) as RawPrioritizationResponse;

    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.suggestions)) {
      throw new Error(
        'Gemini no devolvió un objeto con la forma { suggestions: SuggestionItem[] }'
      );
    }

    const validCategories = getFrameworkCategories(framework);

    return raw.suggestions
      .filter(
        (sug) =>
          sug &&
          typeof sug.storyId === 'string' &&
          typeof sug.suggestedCategory === 'string' &&
          typeof sug.justification === 'string' &&
          validCategories.includes(sug.suggestedCategory)
      )
      .map((sug) => ({
        storyId: sug.storyId.trim(),
        suggestedCategory: sug.suggestedCategory as FrameworkCategory,
        justification: `${GEMINI_PRIORITIZATION_PREFIX} ${sug.justification.trim()}`,
      }));
  }
}
