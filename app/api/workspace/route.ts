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
  createUserStoryAcrossWorkspace,
  deleteUserStoryAcrossWorkspace,
  updateUserStoryAcrossWorkspace,
  createEpicAcrossWorkspace,
  updateEpicAcrossWorkspace,
  deleteEpicAcrossWorkspace,
  updateSprintPlanAcrossWorkspace,
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
} from '@/lib/workspace-service';
import type { Agent1State } from '@/lib/types/agent-1';
import type { Agent2State, Agent2Input, UserStory } from '@/lib/types/agent-2';
import type { Agent3State, StoryEstimation } from '@/lib/types/agent-3';
import type { Agent4State, FrameworkCategory, StoryPrioritization } from '@/lib/types/agent-4';
import type { Agent5State, SprintPlan } from '@/lib/types/agent-5';
import type { Agent3Input, Agent4Input, Agent5Input, Agent6Input } from '@/lib/types/workspace';
import type { KanbanStatus, ProjectMember, ProjectMemberRole } from '@/lib/types/execution';

interface PatchBody {
  agent?: 'agent1' | 'agent2' | 'agent3' | 'agent4' | 'agent5';
  data?: Agent1State | Agent2State | Agent3State | Agent4State | Agent5State;
  preferences?: { lastAgent?: string };
}

interface PostBody {
  action?:
    | 'approveAgent1'
    | 'approveAgent2'
    | 'approveAgent3'
    | 'approveAgent4'
    | 'approveAgent5'
    | 'createUserStory'
    | 'deleteUserStory'
    | 'updateUserStory'
    | 'createEpic'
    | 'updateEpic'
    | 'deleteEpic'
    | 'updateSprintPlan'
    | 'initializeExecution'
    | 'upsertProjectMember'
    | 'deleteProjectMember'
    | 'updateStoryExecution'
    | 'bulkUpdateStoryExecutions'
    | 'updateExecutionSprintFilter'
    | 'resetAgent1'
    | 'resetAgent2'
    | 'resetAgent3'
    | 'resetAgent4'
    | 'resetAgent5'
    | 'resetWorkspace';
  payload?:
    | Agent2Input
    | Agent3Input
    | Agent4Input
    | Agent5Input
    | Agent6Input
    | {
        storyId: string;
        updates: Partial<UserStory>;
        estimationUpdates?: Partial<StoryEstimation>;
        prioritizationUpdates?: Partial<StoryPrioritization>;
        epicId?: string;
        sprintId?: string | null;
      }
    | {
        plan: SprintPlan;
      }
    | {
        epicId: string;
        sprintId?: string | null;
        title: string;
        description: string;
        acceptanceCriteria: string[];
        points: number;
        category?: FrameworkCategory;
      }
    | {
        storyId: string;
      }
    | {
        title: string;
        description: string;
      }
    | {
        epicId: string;
        title?: string;
        description?: string;
      }
    | {
        epicId: string;
      }
    | {
        member?: {
          id?: string;
          displayName: string;
          email?: string;
          role: ProjectMemberRole;
        };
        memberId?: string;
        storyId?: string;
        patch?: {
          status?: KanbanStatus;
          assigneeId?: string | null;
          columnOrder?: number;
        };
        updates?: { storyId: string; status: KanbanStatus; columnOrder: number }[];
        sprintFilter?: string | 'all';
      };
}

function handleError(error: unknown, fallback: string): NextResponse {
  return handleApiError(error, fallback);
}

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const data = await getWorkspaceData(uid);
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error, 'Error al obtener el workspace');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = (await request.json()) as PatchBody;

    if (body.preferences?.lastAgent !== undefined) {
      await saveLastAgent(uid, String(body.preferences.lastAgent));
      return NextResponse.json({ ok: true });
    }

    if (body.agent === 'agent1' && body.data) {
      await saveAgent1State(uid, body.data as Agent1State);
      return NextResponse.json({ ok: true });
    }

    if (body.agent === 'agent2' && body.data) {
      await saveAgent2State(uid, body.data as Agent2State);
      return NextResponse.json({ ok: true });
    }

    if (body.agent === 'agent3' && body.data) {
      await saveAgent3State(uid, body.data as Agent3State);
      return NextResponse.json({ ok: true });
    }

    if (body.agent === 'agent4' && body.data) {
      await saveAgent4State(uid, body.data as Agent4State);
      return NextResponse.json({ ok: true });
    }

    if (body.agent === 'agent5' && body.data) {
      await saveAgent5State(uid, body.data as Agent5State);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 });
  } catch (error) {
    return handleError(error, 'Error al guardar el workspace');
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = (await request.json()) as PostBody;

    switch (body.action) {
      case 'approveAgent1':
        await approveAgent1(uid, body.payload as Agent2Input);
        return NextResponse.json({ ok: true });
      case 'approveAgent2':
        await approveAgent2(uid, body.payload as Agent3Input);
        return NextResponse.json({ ok: true });
      case 'approveAgent3':
        await approveAgent3(uid, body.payload as Agent4Input);
        return NextResponse.json({ ok: true });
      case 'approveAgent4':
        await approveAgent4(uid, body.payload as Agent5Input);
        return NextResponse.json({ ok: true });
      case 'approveAgent5':
        await approveAgent5(uid, body.payload as Agent6Input);
        return NextResponse.json({ ok: true });
      case 'createUserStory': {
        const payload = body.payload as {
          epicId?: string;
          sprintId?: string | null;
          title?: string;
          description?: string;
          acceptanceCriteria?: string[];
          points?: number;
          category?: FrameworkCategory;
        };
        if (!payload.epicId || !payload.title || !payload.description || payload.points === undefined) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await createUserStoryAcrossWorkspace(uid, {
          epicId: payload.epicId,
          sprintId: payload.sprintId ?? null,
          title: payload.title,
          description: payload.description,
          acceptanceCriteria: payload.acceptanceCriteria ?? [],
          points: payload.points,
          category: payload.category,
        });
        return NextResponse.json({ ok: true, workspace });
      }
      case 'deleteUserStory': {
        const payload = body.payload as { storyId?: string };
        if (!payload.storyId) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await deleteUserStoryAcrossWorkspace(uid, payload.storyId);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'updateUserStory': {
        const payload = body.payload as {
          storyId?: string;
          updates?: Partial<UserStory>;
          estimationUpdates?: Partial<StoryEstimation>;
          prioritizationUpdates?: Partial<StoryPrioritization>;
          epicId?: string;
          sprintId?: string | null;
        };
        if (!payload.storyId || !payload.updates) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await updateUserStoryAcrossWorkspace(
          uid,
          payload.storyId,
          payload.updates,
          payload.estimationUpdates,
          {
            epicId: payload.epicId,
            sprintId: payload.sprintId,
          },
          payload.prioritizationUpdates
        );
        return NextResponse.json({ ok: true, workspace });
      }
      case 'createEpic': {
        const payload = body.payload as { title?: string; description?: string };
        if (!payload.title?.trim() || !payload.description?.trim()) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await createEpicAcrossWorkspace(uid, {
          title: payload.title,
          description: payload.description,
        });
        return NextResponse.json({ ok: true, workspace });
      }
      case 'updateEpic': {
        const payload = body.payload as {
          epicId?: string;
          title?: string;
          description?: string;
        };
        if (!payload.epicId || (payload.title === undefined && payload.description === undefined)) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await updateEpicAcrossWorkspace(uid, payload.epicId, {
          title: payload.title,
          description: payload.description,
        });
        return NextResponse.json({ ok: true, workspace });
      }
      case 'deleteEpic': {
        const payload = body.payload as { epicId?: string };
        if (!payload.epicId) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await deleteEpicAcrossWorkspace(uid, payload.epicId);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'updateSprintPlan': {
        const payload = body.payload as { plan?: SprintPlan };
        if (!payload.plan) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await updateSprintPlanAcrossWorkspace(uid, payload.plan);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'initializeExecution': {
        const workspace = await ensureExecutionInitialized(uid);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'upsertProjectMember': {
        const payload = body.payload as {
          member?: {
            id?: string;
            displayName: string;
            email?: string;
            role: ProjectMemberRole;
          };
        };
        if (!payload.member?.displayName || !payload.member.role) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await upsertProjectMember(uid, payload.member);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'deleteProjectMember': {
        const payload = body.payload as { memberId?: string };
        if (!payload.memberId) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await deleteProjectMember(uid, payload.memberId);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'updateStoryExecution': {
        const payload = body.payload as {
          storyId?: string;
          patch?: {
            status?: KanbanStatus;
            assigneeId?: string | null;
            columnOrder?: number;
          };
        };
        if (!payload.storyId || !payload.patch) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await updateStoryExecution(uid, payload.storyId, payload.patch);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'bulkUpdateStoryExecutions': {
        const payload = body.payload as {
          updates?: { storyId: string; status: KanbanStatus; columnOrder: number }[];
        };
        if (!payload.updates?.length) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await bulkUpdateStoryExecutions(uid, payload.updates);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'updateExecutionSprintFilter': {
        const payload = body.payload as { sprintFilter?: string | 'all' };
        if (payload.sprintFilter === undefined) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await updateExecutionSprintFilter(uid, payload.sprintFilter);
        return NextResponse.json({ ok: true, workspace });
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
      default:
        return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }
  } catch (error) {
    return handleError(error, 'Error al actualizar el workspace');
  }
}
