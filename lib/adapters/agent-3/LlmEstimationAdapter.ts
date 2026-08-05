/**
 * @fileoverview Adaptador multi-proveedor para el Agente 3 — Estimación.
 */

import type { IEstimationAdapter } from './IEstimationAdapter';
import type { LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import {
  FIBONACCI_SCALE_LABEL,
  AGENT3_JUSTIFICATION_PREFIX,
  MAX_JUSTIFICATION_LENGTH,
} from '@/lib/constants/agent-3';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import type { AiGenerationConfig } from '@/lib/plans/types';
import { defaultAiConfig } from '@/lib/plans/ai-config';
import { generateJson } from '@/lib/llm/generate';
import type { LlmCredentials } from '@/lib/llm/types';

interface RawEstimationResponse {
  suggestions: Array<{
    storyId: string;
    suggestedPoints: number;
    justification: string;
  }>;
}

export class LlmEstimationAdapter implements IEstimationAdapter {
  constructor(private credentials: LlmCredentials) {}

  async estimateBacklog(
    epics: LocalEpic[],
    aiConfig?: AiGenerationConfig
  ): Promise<Agent3SuggestionItem[]> {
    return this.estimateBacklogStream(epics, () => {}, aiConfig);
  }

  async estimateBacklogStream(
    epics: LocalEpic[],
    onThought: LLMThoughtCallback,
    aiConfig?: AiGenerationConfig
  ): Promise<Agent3SuggestionItem[]> {
    const config = aiConfig ?? defaultAiConfig();

    try {
      const { systemInstruction, userPrompt } = this.buildPrompts(epics);

      const { text: responseText } = await generateJson(this.credentials, {
        systemInstruction,
        userPrompt,
        temperature: 0.1,
        thinkingBudget: config.thinkingBudget,
        onThought,
      });

      return this.parseEstimationResponse(responseText);
    } catch (error) {
      console.error('[LlmEstimationAdapter] Error al estimar backlog:', error);
      throw new Error(
        `Error en el servicio de estimación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  private buildPrompts(epics: LocalEpic[]): { systemInstruction: string; userPrompt: string } {
    const systemInstruction = `Devuelve la respuesta estrictamente como un objeto JSON con la siguiente forma exacta. No incluyas markdown, bloques de código (\`\`\`json) ni ningún texto extra — solo el JSON puro.

{
  "suggestions": [
    {
      "storyId": "ID-DE-LA-HISTORIA",
      "suggestedPoints": 5,
      "justification": "Explicación técnica ultra-concisa de la complejidad."
    }
  ]
}

REGLAS CRÍTICAS:
- 'suggestedPoints' debe ser un número entero que pertenezca ESTRICTAMENTE a la escala Fibonacci: ${FIBONACCI_SCALE_LABEL}.
- Evalúa la complejidad basándote en persistencia de datos, seguridad, lógica frontend y backend de la historia de usuario.
- La justificación debe ser clara, profesional y técnica (máximo ${MAX_JUSTIFICATION_LENGTH} caracteres).`;

    const userPrompt = `Eres un Scrum Master y Arquitecto de Software experto en estimación ágil.
A partir del siguiente backlog estructurado por el Agente 2, calcula los Story Points correspondientes para cada una de las historias de usuario.

BACKLOG A EVALUAR:
${JSON.stringify(epics, null, 2)}`;

    return { systemInstruction, userPrompt };
  }

  private parseEstimationResponse(responseText: string): Agent3SuggestionItem[] {
    const raw = JSON.parse(responseText) as RawEstimationResponse;

    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.suggestions)) {
      throw new Error('Gemini no devolvió un objeto con la forma { suggestions: SuggestionItem[] }');
    }

    // Filtrar y limpiar posibles respuestas corruptas
    return raw.suggestions
      .filter((sug) => sug && typeof sug.storyId === 'string' && typeof sug.suggestedPoints === 'number' && typeof sug.justification === 'string')
      .map((sug) => ({
        storyId: sug.storyId.trim(),
        suggestedPoints: sug.suggestedPoints,
        justification: `${AGENT3_JUSTIFICATION_PREFIX} ${sug.justification.trim()}`,
      }));
  }
}