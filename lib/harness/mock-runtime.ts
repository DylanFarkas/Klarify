/**
 * @fileoverview Runtime mock del harness cuando no hay LLM configurado.
 */

import {
  createHarnessMessage,
  getHarnessHistory,
  saveHarnessHistory,
} from '@/lib/harness/history';
import {
  executeHarnessTool,
  formatToolOutcome,
  isPendingConfirmation,
} from '@/lib/harness/tools';
import type {
  HarnessChatMessage,
  HarnessConfirmedAction,
  HarnessStreamEvent,
  HarnessToolResult,
} from '@/lib/harness/types';
import { checkAndIncrementHarnessMessage } from '@/lib/plans/plan-service';

export type MockHarnessEventCallback = (event: HarnessStreamEvent) => void;

export interface MockRunInput {
  uid: string;
  message: string;
  confirmedAction?: HarnessConfirmedAction;
}

function parseSimpleCommand(message: string): {
  name: string;
  args: Record<string, unknown>;
} | null {
  const trimmed = message.trim();

  if (/^(lista|listar|muestra|mostrar|ver)\b/i.test(trimmed) || /backlog/i.test(trimmed)) {
    return { name: 'list_backlog', args: {} };
  }

  const getStory = trimmed.match(
    /^(?:ver|mostrar|get)\s+(?:la\s+)?(?:hu|historia|story)[\s_-]*(\d+)$/i
  );
  if (getStory) {
    return { name: 'get_story', args: { storyId: `HU-${getStory[1]}` } };
  }

  const createEpic = trimmed.match(
    /^crea(?:r)?\s+epica\s+["'](.+?)["']\s*[:\-]\s*(.+)$/i
  );
  if (createEpic) {
    return {
      name: 'create_epic',
      args: { title: createEpic[1], description: createEpic[2] },
    };
  }

  const deleteStory = trimmed.match(
    /^elimina(?:r)?\s+(?:la\s+)?(?:hu|historia|story)[\s_-]*(\d+)$/i
  );
  if (deleteStory) {
    return { name: 'delete_story', args: { storyId: `HU-${deleteStory[1]}` } };
  }
  const deleteStoryId = trimmed.match(/^elimina(?:r)?\s+((?:HU|STORY)[\s_-]*\d+)$/i);
  if (deleteStoryId) {
    return { name: 'delete_story', args: { storyId: deleteStoryId[1].toUpperCase() } };
  }

  const deleteEpic = trimmed.match(/^elimina(?:r)?\s+(?:la\s+)?(?:epic|epica)[\s_-]*(\d+)$/i);
  if (deleteEpic) {
    return { name: 'delete_epic', args: { epicId: `EPIC-${deleteEpic[1]}` } };
  }
  const deleteEpicId = trimmed.match(/^elimina(?:r)?\s+(EPIC[\s_-]*\d+)$/i);
  if (deleteEpicId) {
    return { name: 'delete_epic', args: { epicId: deleteEpicId[1].toUpperCase() } };
  }

  const createSprint = trimmed.match(
    /^crea(?:r)?\s+(?:un\s+)?sprint(?:\s+(?:para|de|:)\s+(.+))?$/i
  );
  if (createSprint) {
    return {
      name: 'create_sprint',
      args: createSprint[1]?.trim() ? { goal: createSprint[1].trim() } : {},
    };
  }

  const deleteSprint = trimmed.match(
    /^elimina(?:r)?\s+(?:el\s+)?sprint[\s_-]*(\d+)$/i
  );
  if (deleteSprint) {
    return { name: 'delete_sprint', args: { sprintId: `SPRINT-${deleteSprint[1]}` } };
  }
  const deleteSprintId = trimmed.match(/^elimina(?:r)?\s+(SPRINT[\s_-]*\d+)$/i);
  if (deleteSprintId) {
    return { name: 'delete_sprint', args: { sprintId: deleteSprintId[1].toUpperCase() } };
  }

  return null;
}

function toolEndOk(result: HarnessToolResult): boolean {
  return result.status === 'success' || result.status === 'pending_confirmation';
}

function confirmationMessage(result: HarnessToolResult): string {
  const label = result.confirmationLabel ?? result.summary;
  return `${label} Confirma en el panel o escribe «sí».`;
}

export async function runMockHarnessTurn(
  input: MockRunInput,
  onEvent: MockHarnessEventCallback
): Promise<{ messages: HarnessChatMessage[]; remaining: number | null }> {
  const { projectId, messages: history } = await getHarnessHistory(input.uid);
  const { remaining } = await checkAndIncrementHarnessMessage(input.uid);

  const userMessage = createHarnessMessage(
    'user',
    input.message.trim() || 'Confirmar acción'
  );
  let conversation = [...history, userMessage];
  let workspaceMutated = false;
  const notes: string[] = [];
  const turnOutcomes: string[] = [];

  const actions: { name: string; args: Record<string, unknown> }[] = [];

  if (input.confirmedAction) {
    actions.push({
      name: input.confirmedAction.name,
      args: { ...input.confirmedAction.args, confirm: true },
    });
  }

  const parsed = parseSimpleCommand(input.message);
  if (parsed) {
    actions.push(parsed);
  } else if (!input.confirmedAction) {
    actions.push({ name: 'list_backlog', args: {} });
  }

  for (const action of actions) {
    onEvent({ type: 'tool_start', name: action.name, args: action.args });
    const result = await executeHarnessTool(action.name, action.args, {
      uid: input.uid,
    });
    turnOutcomes.push(formatToolOutcome(action.name, result));
    onEvent({
      type: 'tool_end',
      name: action.name,
      summary: result.summary,
      mutated: Boolean(result.mutated),
      ok: toolEndOk(result),
    });

    if (isPendingConfirmation(result)) {
      const confirmedArgs = {
        ...action.args,
        ...(result.data && typeof result.data === 'object'
          ? (result.data as Record<string, unknown>)
          : {}),
      };
      onEvent({
        type: 'confirm',
        name: action.name,
        args: confirmedArgs,
        label: result.confirmationLabel ?? result.summary,
      });
      notes.push(confirmationMessage(result));
      break;
    }

    if (result.mutated) {
      workspaceMutated = true;
      onEvent({ type: 'workspace_updated' });
    }

    notes.push(result.summary);
    if (action.name === 'list_backlog' && result.data) {
      const data = result.data as {
        epicCount: number;
        storyCount: number;
        epics: Array<{ id: string; title: string; stories: Array<{ id: string; title: string }> }>;
      };
      const lines = data.epics
        .slice(0, 8)
        .map(
          (epic) =>
            `• ${epic.id} ${epic.title} (${epic.stories.length} HU): ${epic.stories
              .slice(0, 4)
              .map((s) => s.id)
              .join(', ')}`
        );
      notes.push(lines.join('\n') || 'Backlog vacío.');
    }

    if (result.status === 'error') {
      break;
    }
  }

  const assistantText =
    notes.join('\n\n') ||
    'Modo mock activo. Prueba: "lista el backlog", "crear epica \\"Auth\\": login y sesión", o "eliminar HU-001".';

  onEvent({ type: 'message', role: 'assistant', text: assistantText });

  const assistantMessage = createHarnessMessage('assistant', assistantText);
  conversation = [...conversation, assistantMessage];
  const saved = await saveHarnessHistory(
    input.uid,
    projectId,
    conversation,
    turnOutcomes
  );

  if (workspaceMutated) {
    onEvent({ type: 'workspace_updated' });
  }

  return { messages: saved, remaining };
}
