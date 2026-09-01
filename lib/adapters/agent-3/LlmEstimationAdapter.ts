/**
 * @fileoverview Adaptador multi-proveedor para el Agente 3 — Estimación.
 */

import type { IEstimationAdapter } from './IEstimationAdapter';
import type { EstimationMode, LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import {
  FIBONACCI_SCALE_LABEL,
  AGENT3_JUSTIFICATION_PREFIX,
  MAX_JUSTIFICATION_LENGTH,
  TIME_DURATION_EXAMPLES,
} from '@/lib/constants/agent-3';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import type { AiGenerationConfig } from '@/lib/plans/types';
import { defaultAiConfig } from '@/lib/plans/ai-config';
import { generateJson } from '@/lib/llm/generate';
import type { LlmCredentials } from '@/lib/llm/types';
import { isAllowedStoryPoint, parseDurationLabel } from '@/lib/utils/estimation';

interface RawPointsResponse {
  suggestions: Array<{
    storyId: string;
    suggestedPoints: number;
    justification: string;
  }>;
}

interface RawTimeResponse {
  suggestions: Array<{
    storyId: string;
    suggestedDuration: string;
    justification: string;
  }>;
}

export class LlmEstimationAdapter implements IEstimationAdapter {
  constructor(private credentials: LlmCredentials) {}

  async estimateBacklog(
    epics: LocalEpic[],
    estimationMode: EstimationMode,
    aiConfig?: AiGenerationConfig
  ): Promise<Agent3SuggestionItem[]> {
    return this.estimateBacklogStream(epics, estimationMode, () => {}, aiConfig);
  }

  async estimateBacklogStream(
    epics: LocalEpic[],
    estimationMode: EstimationMode,
    onThought: LLMThoughtCallback,
    aiConfig?: AiGenerationConfig
  ): Promise<Agent3SuggestionItem[]> {
    const config = aiConfig ?? defaultAiConfig();

    try {
      const { systemInstruction, userPrompt } = this.buildPrompts(epics, estimationMode);

      const { text: responseText } = await generateJson(this.credentials, {
        systemInstruction,
        userPrompt,
        temperature: 0.1,
        thinkingBudget: config.thinkingBudget,
        onThought,
      });

      return this.parseEstimationResponse(responseText, estimationMode);
    } catch (error) {
      console.error('[LlmEstimationAdapter] Error al estimar backlog:', error);
      throw new Error(
        `Error en el servicio de estimación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  private buildPrompts(
    epics: LocalEpic[],
    mode: EstimationMode
  ): { systemInstruction: string; userPrompt: string } {
    if (mode === 'time') {
      const systemInstruction = `Devuelve la respuesta estrictamente como un objeto JSON con la siguiente forma exacta. No incluyas markdown, bloques de código (\`\`\`json) ni ningún texto extra — solo el JSON puro.

{
  "suggestions": [
    {
      "storyId": "ID-DE-LA-HISTORIA",
      "suggestedDuration": "4h",
      "justification": "Explicación técnica ultra-concisa del esfuerzo."
    }
  ]
}

REGLAS CRÍTICAS:
- 'suggestedDuration' debe ser UNA sola unidad: ${TIME_DURATION_EXAMPLES}.
- 1d = 24 horas calendario. 1h = 60 minutos. No combines unidades (prohibido "1d 4h").
- Decimales solo en d o h (p. ej. 2.5h). Los minutos son enteros (p. ej. 50m).
- Estima TIEMPO EFECTIVO DE IMPLEMENTACIÓN para una sola persona desarrolladora, no tiempo de espera, no buffers, no ceremonias, no QA manual, no despliegues lentos, no aprobaciones externas y no margen de gestión.
- Sé conservador con tareas comunes: CRUD simples, formularios estándar, login convencional, pantallas básicas, validaciones corrientes y endpoints típicos normalmente caben en horas, no en días completos.
- Usa 'd' solo cuando la historia implique complejidad real alta o varias piezas acopladas (p. ej. múltiples vistas + backend + reglas complejas + seguridad delicada + integraciones + estados de error relevantes).
- Prefiere estas referencias aproximadas:
  - 30m-2h: ajustes chicos, bugs acotados, cambios visuales, wiring simple.
  - 2h-6h: formularios estándar, endpoints sencillos, login/auth convencional, listas CRUD pequeñas.
  - 6h-12h: historias medianas con frontend + backend + validaciones + persistencia.
  - 1d-2d: solo si hay complejidad técnica sustancial, incertidumbre alta o varias capas importantes.
- Evita inflar por dominio: que sea un juego, e-commerce o SaaS NO implica más tiempo por sí mismo; estima la historia concreta.
- Si dudas entre dos valores cercanos, elige el menor razonable.
- La justificación debe ser clara, profesional y técnica (máximo ${MAX_JUSTIFICATION_LENGTH} caracteres).
- Estima solo cada historia (storyId HU-XXX / BUG-XXX / TASK-XXX). Las subtareas son contexto de alcance: no emitas sugerencias por subtarea.`;

      const userPrompt = `Eres un Scrum Master y Arquitecto de Software experto en estimación de esfuerzo.
A partir del siguiente backlog estructurado por el Agente 2, estima el tiempo de implementación de cada historia de usuario con criterio pragmático y sin sobreestimar tareas comunes.

Antes de decidir, calibra internamente la dificultad real:
- Login con email y contraseña convencional: normalmente horas, no 1 día completo.
- Registro estándar con formulario + validación + endpoint: normalmente horas o medio día, no varios días.
- Usa días solo cuando el alcance incluya varias piezas relevantes o complejidad técnica no trivial.

BACKLOG A EVALUAR:
${JSON.stringify(epics, null, 2)}`;

      return { systemInstruction, userPrompt };
    }

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
- La justificación debe ser clara, profesional y técnica (máximo ${MAX_JUSTIFICATION_LENGTH} caracteres).
- Estima solo cada historia (storyId HU-XXX / BUG-XXX / TASK-XXX). Las subtareas son contexto de alcance: no emitas sugerencias por subtarea.`;

    const userPrompt = `Eres un Scrum Master y Arquitecto de Software experto en estimación ágil.
A partir del siguiente backlog estructurado por el Agente 2, calcula los Story Points correspondientes para cada una de las historias de usuario.

BACKLOG A EVALUAR:
${JSON.stringify(epics, null, 2)}`;

    return { systemInstruction, userPrompt };
  }

  private parseEstimationResponse(
    responseText: string,
    mode: EstimationMode
  ): Agent3SuggestionItem[] {
    const raw = JSON.parse(responseText) as RawPointsResponse | RawTimeResponse;

    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.suggestions)) {
      throw new Error('El modelo no devolvió un objeto con la forma { suggestions: SuggestionItem[] }');
    }

    if (mode === 'time') {
      return (raw.suggestions as RawTimeResponse['suggestions'])
        .filter(
          (sug) =>
            sug &&
            typeof sug.storyId === 'string' &&
            typeof sug.suggestedDuration === 'string' &&
            typeof sug.justification === 'string'
        )
        .flatMap((sug) => {
          try {
            const parsed = parseDurationLabel(sug.suggestedDuration);
            return [
              {
                storyId: sug.storyId.trim(),
                suggestedDuration: parsed.label,
                durationMinutes: parsed.minutes,
                justification: `${AGENT3_JUSTIFICATION_PREFIX} ${sug.justification.trim()}`,
              },
            ];
          } catch {
            return [];
          }
        });
    }

    return (raw.suggestions as RawPointsResponse['suggestions'])
      .filter(
        (sug) =>
          sug &&
          typeof sug.storyId === 'string' &&
          typeof sug.suggestedPoints === 'number' &&
          typeof sug.justification === 'string' &&
          isAllowedStoryPoint(sug.suggestedPoints)
      )
      .map((sug) => ({
        storyId: sug.storyId.trim(),
        suggestedPoints: sug.suggestedPoints,
        justification: `${AGENT3_JUSTIFICATION_PREFIX} ${sug.justification.trim()}`,
      }));
  }
}
