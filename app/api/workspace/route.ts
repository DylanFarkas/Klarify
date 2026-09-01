/**
 * @fileoverview API Route — /api/workspace
 *
 * Punto de acceso autenticado al workspace persistido en Firestore.
 *   - GET   → devuelve workspace + preferencias del usuario
 *   - PATCH → guarda el estado de un agente o las preferencias
 *   - POST  → ejecuta acciones del pipeline (aprobar / resetear)
 *
 * Toda petición se autentica con `verifyRequestUser` (igual que /api/github).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { handleApiError } from '@/lib/api-error';
import {
  getWorkspaceData,
  saveAgent1State,
  saveAgent2State,
  saveAgent3State,
  saveAgent4State,
  saveAgent5State,
  saveLastAgent,
  approveAgent1,
  approveAgent2,
  approveAgent3,
  approveAgent4,
  approveAgent5,
  bootstrapDashboardFromAgent4,
  createUserStoryAcrossWorkspace,
  deleteUserStoryAcrossWorkspace,
  updateUserStoryAcrossWorkspace,
  createEpicAcrossWorkspace,
  updateEpicAcrossWorkspace,
  deleteEpicAcrossWorkspace,
  updateSprintPlanAcrossWorkspace,
  startSprintAcrossWorkspace,
  completeSprintAcrossWorkspace,
  resetAgent1,
  resetAgent2,
  resetAgent3,
  resetAgent4,
  resetAgent5,
  resetWorkspace,
  ensureExecutionInitialized,
  upsertProjectMember,
  deleteProjectMember,
  updateStoryExecution,
  bulkUpdateStoryExecutions,
  updateExecutionSprintFilter,
  saveStackAcrossWorkspace,
  clearStackAcrossWorkspace,
} from '@/lib/workspace-service';
import type { Agent1State } from '@/lib/types/agent-1';
import type { Agent2State, Agent2Input, UserStory } from '@/lib/types/agent-2';
import type { Agent3State, StoryEstimation } from '@/lib/types/agent-3';
import type { Agent4State, StoryPrioritization } from '@/lib/types/agent-4';
import type { Agent5State, SprintPlan } from '@/lib/types/agent-5';
import type { Agent3Input, Agent4Input, Agent5Input, Agent6Input } from '@/lib/types/workspace';
import type { ProjectStack } from '@/lib/types/stack';
import { parseWorkspaceScope } from '@/lib/project-store/scope';
import { parseApiBody } from '@/lib/schemas/parse';
import {
  workspacePatchSchema,
  workspacePostSchema,
} from '@/lib/schemas/workspace-api';

function handleError(error: unknown, fallback: string): NextResponse {
  return handleApiError(error, fallback);
}

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const scope = parseWorkspaceScope(request.nextUrl.searchParams.get('scope'));
    const agent = request.nextUrl.searchParams.get('agent') ?? undefined;
    const projectId = request.nextUrl.searchParams.get('projectId')?.trim() || undefined;
    const data = await getWorkspaceData(uid, { scope, agent, projectId });
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error, 'Error al obtener el workspace');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = parseApiBody(workspacePatchSchema, await request.json());

    if ('preferences' in body) {
      await saveLastAgent(uid, body.preferences.lastAgent);
      return NextResponse.json({ ok: true });
    }

    switch (body.agent) {
      case 'agent1':
        await saveAgent1State(uid, body.data as unknown as Agent1State);
        return NextResponse.json({ ok: true });
      case 'agent2':
        await saveAgent2State(uid, body.data as unknown as Agent2State);
        return NextResponse.json({ ok: true });
      case 'agent3':
        await saveAgent3State(uid, body.data as unknown as Agent3State);
        return NextResponse.json({ ok: true });
      case 'agent4':
        await saveAgent4State(uid, body.data as unknown as Agent4State);
        return NextResponse.json({ ok: true });
      case 'agent5':
        await saveAgent5State(uid, body.data as unknown as Agent5State);
        return NextResponse.json({ ok: true });
    }
  } catch (error) {
    return handleError(error, 'Error al guardar el workspace');
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = parseApiBody(workspacePostSchema, await request.json());
    const projectId = body.projectId;

    switch (body.action) {
      case 'approveAgent1':
        await approveAgent1(uid, body.payload as unknown as Agent2Input);
        return NextResponse.json({ ok: true });
      case 'approveAgent2':
        await approveAgent2(uid, body.payload as unknown as Agent3Input);
        return NextResponse.json({ ok: true });
      case 'approveAgent3':
        await approveAgent3(uid, body.payload as unknown as Agent4Input);
        return NextResponse.json({ ok: true });
      case 'approveAgent4':
        await approveAgent4(uid, body.payload as unknown as Agent5Input);
        return NextResponse.json({ ok: true });
      case 'approveAgent5':
        await approveAgent5(uid, body.payload as unknown as Agent6Input);
        return NextResponse.json({ ok: true });
      case 'bootstrapDashboardFromAgent4': {
        const workspace = await bootstrapDashboardFromAgent4(uid);
        return NextResponse.json({ ok: true, workspace: workspace ?? undefined });
      }
      case 'createUserStory': {
        const payload = body.payload;
        try {
          const { storyId } = await createUserStoryAcrossWorkspace(uid, {
            epicId: payload.epicId,
            sprintId: payload.sprintId ?? null,
            type: payload.type,
            title: payload.title ?? '',
            description: payload.description ?? '',
            acceptanceCriteria: payload.acceptanceCriteria ?? [],
            subtasks: payload.subtasks as import('@/lib/types/agent-2').StorySubtask[] | string[] | undefined,
            points: payload.points,
            durationLabel: payload.durationLabel,
            category: payload.category,
            severity: payload.severity,
            stepsToReproduce: payload.stepsToReproduce,
            technicalNotes: payload.technicalNotes,
          }, projectId);
          return NextResponse.json({ ok: true, storyId });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'No se pudo crear el ítem';
          return NextResponse.json({ error: message }, { status: 400 });
        }
      }
      case 'deleteUserStory': {
        await deleteUserStoryAcrossWorkspace(uid, body.payload.storyId, projectId);
        return NextResponse.json({ ok: true });
      }
      case 'updateUserStory': {
        const payload = body.payload;
        try {
          await updateUserStoryAcrossWorkspace(
            uid,
            payload.storyId,
            payload.updates as Partial<UserStory>,
            payload.estimationUpdates as Partial<StoryEstimation> | undefined,
            {
              epicId: payload.epicId,
              sprintId: payload.sprintId,
            },
            payload.prioritizationUpdates as Partial<StoryPrioritization> | undefined,
            projectId
          );
          return NextResponse.json({ ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'No se pudo actualizar el ítem';
          return NextResponse.json({ error: message }, { status: 400 });
        }
      }
      case 'createEpic': {
        const { epicId } = await createEpicAcrossWorkspace(uid, {
          title: body.payload.title,
          description: body.payload.description,
        }, projectId);
        return NextResponse.json({ ok: true, epicId });
      }
      case 'updateEpic': {
        await updateEpicAcrossWorkspace(uid, body.payload.epicId, {
          title: body.payload.title,
          description: body.payload.description,
        }, projectId);
        return NextResponse.json({ ok: true });
      }
      case 'deleteEpic': {
        await deleteEpicAcrossWorkspace(uid, body.payload.epicId, projectId);
        return NextResponse.json({ ok: true });
      }
      case 'updateSprintPlan': {
        await updateSprintPlanAcrossWorkspace(
          uid,
          body.payload.plan as unknown as SprintPlan,
          projectId
        );
        return NextResponse.json({ ok: true });
      }
      case 'startSprint': {
        const workspace = await startSprintAcrossWorkspace(uid, body.payload.sprintId, projectId);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'completeSprint': {
        const workspace = await completeSprintAcrossWorkspace(
          uid,
          body.payload.sprintId,
          body.payload.rollover ?? 'backlog',
          projectId
        );
        return NextResponse.json({ ok: true, workspace });
      }
      case 'initializeExecution': {
        const workspace = await ensureExecutionInitialized(uid);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'upsertProjectMember': {
        const workspace = await upsertProjectMember(uid, body.payload.member, projectId);
        return NextResponse.json({ ok: true, ...(workspace ? { workspace } : {}) });
      }
      case 'deleteProjectMember': {
        const workspace = await deleteProjectMember(uid, body.payload.memberId, projectId);
        return NextResponse.json({ ok: true, ...(workspace ? { workspace } : {}) });
      }
      case 'updateStoryExecution': {
        const workspace = await updateStoryExecution(
          uid,
          body.payload.storyId,
          body.payload.patch,
          projectId,
          body.payload.previous
        );
        return NextResponse.json({ ok: true, workspace });
      }
      case 'bulkUpdateStoryExecutions': {
        const workspace = await bulkUpdateStoryExecutions(uid, body.payload.updates, projectId);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'updateExecutionSprintFilter': {
        const workspace = await updateExecutionSprintFilter(
          uid,
          body.payload.sprintFilter,
          projectId
        );
        return NextResponse.json({ ok: true, ...(workspace ? { workspace } : {}) });
      }
      case 'saveStack': {
        const stack = await saveStackAcrossWorkspace(
          uid,
          body.payload as unknown as ProjectStack,
          projectId
        );
        return NextResponse.json({ ok: true, stack });
      }
      case 'clearStack': {
        await clearStackAcrossWorkspace(uid, projectId);
        return NextResponse.json({ ok: true, stack: null });
      }
      case 'resetAgent1':
        await resetAgent1(uid);
        return NextResponse.json({ ok: true });
      case 'resetAgent2':
        await resetAgent2(uid);
        return NextResponse.json({ ok: true });
      case 'resetAgent3':
        await resetAgent3(uid);
        return NextResponse.json({ ok: true });
      case 'resetAgent4':
        await resetAgent4(uid);
        return NextResponse.json({ ok: true });
      case 'resetAgent5':
        await resetAgent5(uid);
        return NextResponse.json({ ok: true });
      case 'resetWorkspace':
        await resetWorkspace(uid);
        return NextResponse.json({ ok: true });
    }
  } catch (error) {
    return handleError(error, 'Error al actualizar el workspace');
  }
}
