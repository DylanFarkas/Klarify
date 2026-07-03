/**
 * @fileoverview Adaptador de Gemini para el Agente 5 — Scrum Master (Sprint Planning).
 * Utiliza el SDK @google/genai para planificar sprints con historias priorizadas.
 * Soporta streaming nativo de pensamientos del modelo vía generateContentStream.
 */

import { GoogleGenAI } from '@google/genai';
import type { ISprintPlanningAdapter } from './ISprintPlanningAdapter';
import type {
  LocalStoryForPlanning,
  SprintPlan,
  SprintPlanningConfig,
  StoryDependency,
  PlannedSprint,
} from '@/lib/types/agent-5';
import { buildSprintSchedule } from '@/lib/types/agent-5';
import { mockPlanSprints } from '@/lib/mock/agent-5-mock';
import {
  SPRINT_ID_PREFIX,
  GEMINI_SPRINT_PLANNING_PREFIX,
  MOSCOW_PRIORITY_ORDER,
} from '@/lib/constants/agent-5';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

interface ContentPart {
  text?: string;
  thought?: boolean;
}

interface RawSprintPlanResponse {
  sprints: Array<{
    sprintGoal: string;
    storyIds: string[];
  }>;
  dependencies: Array<{
    storyId: string;
    dependsOnStoryId: string;
    reason: string;
  }>;
  unassignedStoryIds: string[];
}

export class GeminiSprintPlanningAdapter implements ISprintPlanningAdapter {
  private ai: GoogleGenAI | null = null;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
  }

  async planSprints(
    stories: LocalStoryForPlanning[],
    config: SprintPlanningConfig,
    _dependencies: StoryDependency[]
  ): Promise<SprintPlan> {
    return this.planSprintsStream(stories, config, () => {});
  }

  async planSprintsStream(
    stories: LocalStoryForPlanning[],
    config: SprintPlanningConfig,
    onThought: LLMThoughtCallback
  ): Promise<SprintPlan> {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
    }

    try {
      console.log('[GeminiSprintPlanningAdapter] Iniciando planificación de sprints con Gemini...');

      const { systemInstruction, userPrompt } = this.buildPrompts(stories, config);

      const responseText = await this.streamGenerate(userPrompt, systemInstruction, onThought);

      if (!responseText) {
        throw new Error('Respuesta vacía de Gemini al planificar sprints.');
      }

      console.log('[GEMINI SPRINT RESPONSE]:', responseText);
      const result = this.parseSprintPlanResponse(responseText, config, stories);
      console.log(
        `[GeminiSprintPlanningAdapter] Planificación exitosa. Sprints: ${result.sprints.length}`
      );

      return result;
    } catch (error) {
      console.error('[GeminiSprintPlanningAdapter] Error al planificar sprints:', error);
      throw new Error(
        `Error en el servicio de planificación (Gemini): ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  private buildPrompts(
    stories: LocalStoryForPlanning[],
    config: SprintPlanningConfig
  ): { systemInstruction: string; userPrompt: string } {
    const systemInstruction = `Devuelve la respuesta estrictamente como un objeto JSON con la siguiente forma exacta. No incluyas markdown, bloques de código (\`\`\`json) ni ningún texto extra — solo el JSON puro.

{
  "sprints": [
    {
      "sprintGoal": "Objetivo claro del sprint",
      "storyIds": ["HU-001", "HU-002"]
    }
  ],
  "dependencies": [
    {
      "storyId": "HU-002",
      "dependsOnStoryId": "HU-001",
      "reason": "Motivo de la dependencia"
    }
  ],
  "unassignedStoryIds": []
}

REGLAS CRÍTICAS:
- Asigna cada historia a EXACTAMENTE un sprint.
- Respeta el orden de prioridad MoSCoW: must > should > could > wont.
- La suma de Story Points por sprint NO debe exceder ${config.sprintCapacitySp} SP.
- Detecta dependencias funcionales entre historias y respétalas (una dependiente no puede ir en sprint anterior a su dependencia).
- Cada sprintGoal debe ser un objetivo claro, conciso y orientado a valor de negocio.
- Si hay historias que no caben en la capacidad, inclúyelas en unassignedStoryIds.`;

    const userPrompt = `Eres un Scrum Master experto en planificación de sprints ágiles.

Rol: Release Train Engineer / Scrum Master.
Objetivo: Organizar el backlog priorizado en sprints concretos con Sprint Goals claros.

DATOS DE PLANIFICACIÓN:
- Capacidad del equipo: ${config.sprintCapacitySp} Story Points por sprint
- Duración de cada sprint: ${config.sprintDurationWeeks} semanas
- Orden de prioridad MoSCoW: ${MOSCOW_PRIORITY_ORDER.join(' > ')}

HISTORIAS A PLANIFICAR:
${JSON.stringify(stories, null, 2)}`;

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
        temperature: 0.2,
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 2048,
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

  private parseSprintPlanResponse(
    responseText: string,
    config: SprintPlanningConfig,
    stories: LocalStoryForPlanning[]
  ): SprintPlan {
    const fallbackPlan = () => mockPlanSprints(stories, config);

    let raw: RawSprintPlanResponse;
    try {
      raw = JSON.parse(responseText) as RawSprintPlanResponse;
    } catch {
      return fallbackPlan();
    }

    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sprints)) {
      return fallbackPlan();
    }

    const storyMap = new Map(stories.map((story) => [story.id, story]));
    const allStoryIds = stories.map((story) => story.id);
    const capacity = config.sprintCapacitySp;
    const validRawStoryIds = raw.sprints
      .flatMap((s) => (Array.isArray(s.storyIds) ? s.storyIds : []))
      .filter((storyId): storyId is string => typeof storyId === 'string' && storyMap.has(storyId));
    const hasDuplicateAssignments = validRawStoryIds.length !== new Set(validRawStoryIds).size;
    const seenStoryIds = new Set<string>();

    const normalizeSprintGoal = (goal: string, sprintNumber: number): string => {
      const trimmedGoal = goal.trim();
      const withoutAgentPrefix = trimmedGoal.replace(/^Agente\s+5\s*\([^)]*\):\s*/i, '');
      const withoutSprintPrefix = withoutAgentPrefix.replace(/^Sprint\s+\d+\s*:\s*/i, '');
      return `Sprint ${sprintNumber}: ${withoutSprintPrefix}`;
    };

    const sprints: PlannedSprint[] = raw.sprints
      .filter((s) => s && typeof s.sprintGoal === 'string' && Array.isArray(s.storyIds))
      .map((s, idx) => {
        const uniqueStoryIds: string[] = [];

        for (const storyId of s.storyIds) {
          if (typeof storyId !== 'string' || !storyMap.has(storyId) || seenStoryIds.has(storyId)) {
            continue;
          }

          uniqueStoryIds.push(storyId);
          seenStoryIds.add(storyId);
        }

        const velocitySp = uniqueStoryIds.reduce((sum, storyId) => {
          return sum + (storyMap.get(storyId)?.points ?? 0);
        }, 0);

        return {
          id: `${SPRINT_ID_PREFIX}-${String(idx + 1).padStart(3, '0')}`,
          number: idx + 1,
          sprintGoal: normalizeSprintGoal(s.sprintGoal, idx + 1),
          storyIds: uniqueStoryIds,
          velocitySp,
          startDate: '',
          endDate: '',
          isEdited: false,
        };
      });

    const missingStoryIds = allStoryIds.filter((storyId) => !seenStoryIds.has(storyId));
    const totalPlannedSp = sprints.reduce((sum, sprint) => sum + sprint.velocitySp, 0);
    const totalExpectedSp = stories.reduce((sum, story) => sum + story.points, 0);
    const hasOverCapacitySprint = sprints.some((sprint) => sprint.velocitySp > capacity);

    if (
      sprints.length === 0 ||
      hasDuplicateAssignments ||
      missingStoryIds.length > 0 ||
      hasOverCapacitySprint ||
      totalPlannedSp !== totalExpectedSp
    ) {
      return fallbackPlan();
    }

    const dependencies: StoryDependency[] = (raw.dependencies ?? [])
      .filter(
        (d) =>
          d &&
          typeof d.storyId === 'string' &&
          typeof d.dependsOnStoryId === 'string' &&
          typeof d.reason === 'string'
      )
      .map((d) => ({
        storyId: d.storyId.trim(),
        dependsOnStoryId: d.dependsOnStoryId.trim(),
        reason: `${GEMINI_SPRINT_PLANNING_PREFIX} ${d.reason.trim()}`,
      }));

    const scheduled = buildSprintSchedule(sprints, config);

    return {
      sprints: scheduled,
      dependencies,
      config,
      unassignedStoryIds: raw.unassignedStoryIds ?? [],
    };
  }
}
