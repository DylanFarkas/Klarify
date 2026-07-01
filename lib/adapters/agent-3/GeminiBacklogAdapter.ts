/**
 * @fileoverview Adaptador de Gemini para el Agente 3 — Scrum Master (Estimación).
 * Utiliza el SDK @google/genai para calcular Story Points a partir de las Épicas.
 * Soporta streaming nativo de pensamientos del modelo vía generateContentStream.
 */

import { GoogleGenAI } from '@google/genai';
import type { IEstimationAdapter } from './IEstimationAdapter';
import type { LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

interface ContentPart {
  text?: string;
  thought?: boolean;
}

interface RawEstimationResponse {
  suggestions: Array<{
    storyId: string;
    suggestedPoints: number;
    justification: string;
  }>;
}

export class GeminiEstimationAdapter implements IEstimationAdapter {
  private ai: GoogleGenAI | null = null;
  private modelName = 'gemini-2.5-flash'; // Manteniendo el modelo estándar del proyecto

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
  }

  async estimateBacklog(epics: LocalEpic[]): Promise<Agent3SuggestionItem[]> {
    return this.estimateBacklogStream(epics, () => {});
  }

  async estimateBacklogStream(
    epics: LocalEpic[],
    onThought: LLMThoughtCallback
  ): Promise<Agent3SuggestionItem[]> {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
    }

    try {
      console.log('[GeminiEstimationAdapter] Iniciando análisis de estimación con Gemini...');

      const { systemInstruction, userPrompt } = this.buildPrompts(epics);

      const responseText = await this.streamGenerate(
        userPrompt,
        systemInstruction,
        onThought
      );

      if (!responseText) {
        throw new Error('Respuesta vacía de Gemini al estimar.');
      }
      console.log('🔮 [GEMINI RESPONSE RAW]:', responseText);
      const result = this.parseEstimationResponse(responseText);
      console.log(`[GeminiEstimationAdapter] Estimación exitosa. Historias procesadas: ${result.length}`);
      
      return result;
    } catch (error) {
      console.error('[GeminiEstimationAdapter] Error al estimar backlog:', error);
      throw new Error(
        `Error en el servicio de estimación (Gemini): ${error instanceof Error ? error.message : 'Error desconocido'}`
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
- 'suggestedPoints' debe ser un número entero que pertenezca ESTRICTAMENTE a la escala Fibonacci: 1, 2, 3, 5, 8, 13, 21.
- Evalúa la complejidad basándote en persistencia de datos, seguridad, lógica frontend y backend de la historia de usuario.
- La justificación debe ser clara, profesional y técnica (máximo 140 caracteres).`;

    const userPrompt = `Eres un Scrum Master y Arquitecto de Software experto en estimación ágil.
A partir del siguiente backlog estructurado por el Agente 2, calcula los Story Points correspondientes para cada una de las historias de usuario.

BACKLOG A EVALUAR:
${JSON.stringify(epics, null, 2)}`;

    return { systemInstruction, userPrompt };
  }

  private async streamGenerate(
    contents: string,
    systemInstruction: string,
    onThought: LLMThoughtCallback
  ): Promise<string> {
    if (!this.ai) throw new Error('SDK no inicializado.');

    const responseStream = await this.ai.models.generateContentStream({
      model: this.modelName,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1, // Temperatura baja para asegurar exactitud en estimaciones y JSON estructurado
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 1024,
        },
      },
    });

    let outputText = '';

    for await (const chunk of responseStream) {
      const parts = (chunk.candidates?.[0]?.content?.parts ?? []) as ContentPart[];

      for (const part of parts) {
        if (typeof part.text !== 'string') continue;

        if (part.thought === true) {
          // Captura el razonamiento nativo de Gemini y lo inyecta a la UI mediante la dinámica de Klarify
          onThought(part.text);
        } else {
          outputText += part.text;
        }
      }
    }

    return outputText;
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
        justification: `Agente 3 (Scrum Master): ${sug.justification.trim()}`,
      }));
  }
}