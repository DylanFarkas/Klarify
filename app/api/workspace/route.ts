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
import type { Agent4State, FrameworkCategory, StoryPrioritization } from '@/lib/types/agent-4';
import type { Agent5State, SprintPlan } from '@/lib/types/agent-5';
import type { Agent3Input, Agent4Input, Agent5Input, Agent6Input } from '@/lib/types/workspace';
import type { KanbanStatus, ProjectMember, ProjectMemberRole } from '@/lib/types/execution';
import type { ProjectStack } from '@/lib/types/stack';
import type { SprintCompleteRollover } from '@/lib/utils/sprint-plan-mutations';
import { parseWorkspaceScope } from '@/lib/project-store/scope';

interface PatchBody {
  agent?: 'agent1' | 'agent2' | 'agent3' | 'agent4' | 'agent5';
  data?: Agent1State | Agent2State | Agent3State | Agent4State | Agent5State;
  preferences?: { lastAgent?: string };
}

interface PostBody {
  /** Proyecto activo según el cliente: evita resolverlo leyendo el doc de usuario. */
  projectId?: string;
  action?:
    | 'approveAgent1'
    | 'approveAgent2'
    | 'approveAgent3'
    | 'approveAgent4'
    | 'approveAgent5'
    | 'bootstrapDashboardFromAgent4'
    | 'createUserStory'
    | 'deleteUserStory'
    | 'updateUserStory'
    | 'createEpic'
    | 'updateEpic'
    | 'deleteEpic'
    | 'updateSprintPlan'
    | 'startSprint'
    | 'completeSprint'
    | 'initializeExecution'
    | 'upsertProjectMember'
    | 'deleteProjectMember'
    | 'updateStoryExecution'
    | 'bulkUpdateStoryExecutions'
    | 'updateExecutionSprintFilter'
    | 'saveStack'
    | 'clearStack'
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
        sprintId: string;
        rollover?: SprintCompleteRollover;
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
    const projectId =
      typeof body.projectId === 'string' && body.projectId.trim()
        ? body.projectId.trim()
        : undefined;

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
      case 'bootstrapDashboardFromAgent4': {
        const workspace = await bootstrapDashboardFromAgent4(uid);
        return NextResponse.json({ ok: true, workspace: workspace ?? undefined });
      }
      case 'createUserStory': {
        const payload = body.payload as {
          epicId?: string;
          sprintId?: string | null;
          type?: import('@/lib/types/agent-2').WorkItemType;
          title?: string;
          description?: string;
          acceptanceCriteria?: string[];
          subtasks?: import('@/lib/types/agent-2').StorySubtask[] | string[];
          points?: number;
          durationLabel?: string;
          category?: FrameworkCategory;
          severity?: import('@/lib/types/agent-2').BugSeverity;
          stepsToReproduce?: string[];
          technicalNotes?: string;
        };
        if (!payload.epicId || !payload.title || !payload.description) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        try {
          const { storyId } = await createUserStoryAcrossWorkspace(uid, {
            epicId: payload.epicId,
            sprintId: payload.sprintId ?? null,
            type: payload.type,
            title: payload.title,
            description: payload.description,
            acceptanceCriteria: payload.acceptanceCriteria ?? [],
            subtasks: payload.subtasks,
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
        const payload = body.payload as { storyId?: string };
        if (!payload.storyId) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        await deleteUserStoryAcrossWorkspace(uid, payload.storyId, projectId);
        return NextResponse.json({ ok: true });
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
        try {
          await updateUserStoryAcrossWorkspace(
            uid,
            payload.storyId,
            payload.updates,
            payload.estimationUpdates,
            {
              epicId: payload.epicId,
              sprintId: payload.sprintId,
            },
            payload.prioritizationUpdates,
            projectId
          );
          return NextResponse.json({ ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'No se pudo actualizar el ítem';
          return NextResponse.json({ error: message }, { status: 400 });
        }
      }
      case 'createEpic': {
        const payload = body.payload as { title?: string; description?: string };
        if (!payload.title?.trim() || !payload.description?.trim()) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const { epicId } = await createEpicAcrossWorkspace(uid, {
          title: payload.title,
          description: payload.description,
        }, projectId);
        return NextResponse.json({ ok: true, epicId });
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
        await updateEpicAcrossWorkspace(uid, payload.epicId, {
          title: payload.title,
          description: payload.description,
        }, projectId);
        return NextResponse.json({ ok: true });
      }
      case 'deleteEpic': {
        const payload = body.payload as { epicId?: string };
        if (!payload.epicId) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        await deleteEpicAcrossWorkspace(uid, payload.epicId, projectId);
        return NextResponse.json({ ok: true });
      }
      case 'updateSprintPlan': {
        const payload = body.payload as { plan?: SprintPlan };
        if (!payload.plan) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        await updateSprintPlanAcrossWorkspace(uid, payload.plan, projectId);
        return NextResponse.json({ ok: true });
      }
      case 'startSprint': {
        const payload = body.payload as { sprintId?: string };
        if (!payload.sprintId) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await startSprintAcrossWorkspace(uid, payload.sprintId, projectId);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'completeSprint': {
        const payload = body.payload as {
          sprintId?: string;
          rollover?: SprintCompleteRollover;
        };
        if (!payload.sprintId) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const rollover = payload.rollover === 'next_planned' ? 'next_planned' : 'backlog';
        const workspace = await completeSprintAcrossWorkspace(
          uid,
          payload.sprintId,
          rollover,
          projectId
        );
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
          previous?: {
            status?: KanbanStatus;
            assigneeId?: string | null;
          };
        };
        if (!payload.storyId || !payload.patch) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await updateStoryExecution(
          uid,
          payload.storyId,
          payload.patch,
          projectId,
          payload.previous
        );
        return NextResponse.json({ ok: true, workspace });
      }
      case 'bulkUpdateStoryExecutions': {
        const payload = body.payload as {
          updates?: {
            storyId: string;
            status: KanbanStatus;
            columnOrder: number;
            previousStatus?: KanbanStatus;
          }[];
        };
        if (!payload.updates?.length) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await bulkUpdateStoryExecutions(uid, payload.updates, projectId);
        return NextResponse.json({ ok: true, workspace });
      }
      case 'updateExecutionSprintFilter': {
        const payload = body.payload as { sprintFilter?: string | 'all' };
        if (payload.sprintFilter === undefined) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const workspace = await updateExecutionSprintFilter(uid, payload.sprintFilter, projectId);
        return NextResponse.json({ ok: true, ...(workspace ? { workspace } : {}) });
      }
      case 'saveStack': {
        const payload = body.payload as ProjectStack | undefined;
        if (!payload?.layers) {
          return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        const stack = await saveStackAcrossWorkspace(uid, payload, projectId);
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
      default:
        return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }
  } catch (error) {
    return handleError(error, 'Error al actualizar el workspace');
  }
}
