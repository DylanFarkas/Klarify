/**
 * @fileoverview Adaptador multi-proveedor para el Agente 5 — Sprint Planning.
 */

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
import { sanitizeDependencies } from '@/lib/utils/story-dependencies';
import { mergeAndSanitizeDependencies } from '@/lib/utils/foundational-stories';
import {
  assignStoriesToSprints,
  generateSprintGoals,
} from '@/lib/utils/sprint-assignment';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import { FRAMEWORK_DESCRIPTIONS } from '@/lib/constants/agent-4';
import { getPriorityOrderLabel } from '@/lib/utils/priority-rank';
import {
  SPRINT_ID_PREFIX,
  AGENT5_JUSTIFICATION_PREFIX,
} from '@/lib/constants/agent-5';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import type { AiGenerationConfig } from '@/lib/plans/types';
import { defaultAiConfig } from '@/lib/plans/ai-config';
import { generateJson } from '@/lib/llm/generate';
import type { LlmCredentials } from '@/lib/llm/types';

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

export class LlmSprintPlanningAdapter implements ISprintPlanningAdapter {
  constructor(private credentials: LlmCredentials) {}

  async planSprints(
    stories: LocalStoryForPlanning[],
    config: SprintPlanningConfig,
    framework: PrioritizationFramework,
    _dependencies: StoryDependency[]
  ): Promise<SprintPlan> {
    return this.planSprintsStream(stories, config, framework, () => {});
  }

  async planSprintsStream(
    stories: LocalStoryForPlanning[],
    config: SprintPlanningConfig,
    framework: PrioritizationFramework,
    onThought: LLMThoughtCallback,
    aiConfig?: AiGenerationConfig
  ): Promise<SprintPlan> {
    const ai = aiConfig ?? defaultAiConfig();

    try {
      const { systemInstruction, userPrompt } = this.buildPrompts(stories, config, framework);

      const { text: responseText } = await generateJson(this.credentials, {
        systemInstruction,
        userPrompt,
        temperature: 0.2,
        thinkingBudget: ai.thinkingBudget,
        onThought,
      });

      return this.parseSprintPlanResponse(responseText, config, stories, framework);
    } catch (error) {
      console.error('[LlmSprintPlanningAdapter] Error al planificar sprints:', error);
      throw new Error(
        `Error en el servicio de planificación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  private buildPrompts(
    stories: LocalStoryForPlanning[],
    config: SprintPlanningConfig,
    framework: PrioritizationFramework
  ): { systemInstruction: string; userPrompt: string } {
    const frameworkLabel = FRAMEWORK_DESCRIPTIONS[framework].label;
    const priorityOrder = getPriorityOrderLabel(framework);

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
      "reason": "Requiere completar primero «título de la historia prerequisito»"
    }
  ],
  "unassignedStoryIds": []
}

REGLAS CRÍTICAS:
- Asigna cada historia a EXACTAMENTE un sprint.
- Respeta el orden de prioridad del framework ${frameworkLabel}: ${priorityOrder}.
- La suma de Story Points por sprint NO debe exceder ${config.sprintCapacitySp} SP.
- Detecta dependencias funcionales REALES entre historias (storyId depende de dependsOnStoryId).
- Una dependencia significa: la historia storyId NO puede implementarse ni entregarse antes que dependsOnStoryId.
- Solo declara dependencia si existe relación técnica directa y verificable entre las dos historias.
- El prerequisito (dependsOnStoryId) debe ser una capacidad habilitante que la dependiente necesita para funcionar.
- Las historias de plataforma, infraestructura o habilitación suelen ser prerequisitos de las historias que las consumen, nunca al revés.
- CAPACIDADES HABILITANTES (sprints tempranos): Las historias que CREAN o GESTIONAN capacidades transversales deben ir en Sprint 1-2, aunque tengan muchos Story Points. Ejemplos: gestión de usuarios/roles/permisos, autenticación, modelo de datos, configuración inicial, API base.
- Si una historia de negocio menciona usuarios, roles, permisos, sesión o acceso, probablemente depende de la historia que implementa esa capacidad.
- Si una historia de mayor prioridad depende de una de menor prioridad según ${frameworkLabel}, probablemente la dependencia está invertida: corrígela o no la incluyas.
- Respeta las dependencias al asignar sprints (una dependiente no puede ir en sprint anterior a su prerequisito).
- Cada sprintGoal debe ser un objetivo claro, conciso y orientado a valor de negocio.
- Si hay historias que no caben en la capacidad, inclúyelas en unassignedStoryIds.
- En el campo reason escribe una frase corta y simple en español, por ejemplo: "Requiere completar primero «Acceder al Sistema de Forma Segura»." No uses términos técnicos.
- Si no hay dependencia funcional clara y directa entre dos historias, NO la inventes; devuelve un array dependencies vacío o solo las que estés seguro.`;

    const userPrompt = `Eres un Scrum Master experto en planificación de sprints ágiles.

Rol: Release Train Engineer / Scrum Master.
Objetivo: Organizar el backlog priorizado en sprints concretos con Sprint Goals claros.

DATOS DE PLANIFICACIÓN:
- Capacidad del equipo: ${config.sprintCapacitySp} Story Points por sprint
- Duración de cada sprint: ${config.sprintDurationWeeks} semanas
- Framework de priorización: ${frameworkLabel}
- Orden de prioridad: ${priorityOrder}

HISTORIAS A PLANIFICAR:
${JSON.stringify(stories, null, 2)}`;

    return { systemInstruction, userPrompt };
  }

  private parseSprintPlanResponse(
    responseText: string,
    config: SprintPlanningConfig,
    stories: LocalStoryForPlanning[],
    framework: PrioritizationFramework
  ): SprintPlan {
    const fallbackPlan = () => mockPlanSprints(stories, config, framework);

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

    const llmDependencies: StoryDependency[] = sanitizeDependencies(
      (raw.dependencies ?? [])
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
          reason: `${AGENT5_JUSTIFICATION_PREFIX} ${d.reason.trim()}`,
        })),
      stories,
      { framework }
    );

    const dependencies = mergeAndSanitizeDependencies(llmDependencies, stories, framework);

    const { sprints: rebalancedSprints, unassigned } = assignStoriesToSprints(
      stories,
      dependencies,
      config,
      framework
    );
    const withGoals = generateSprintGoals(rebalancedSprints, stories);
    const scheduled = buildSprintSchedule(withGoals, config);

    return {
      sprints: scheduled,
      dependencies,
      config,
      unassignedStoryIds: unassigned.length > 0 ? unassigned : (raw.unassignedStoryIds ?? []),
    };
  }
}
