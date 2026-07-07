/**
 * @fileoverview API Route — /api/projects
 *
 * GET   → lista proyectos + plan + slots del usuario
 * POST  → crea proyecto (respeta límite del plan)
 * PATCH → cambia proyecto activo o activa slots ({ action: 'activate', projectIds })
 * DELETE → elimina un proyecto (?projectId=...)
 */

import { type NextRequest, NextResponse } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { isPlanLimitError, planErrorToJson } from '@/lib/plans/plan-errors';
import { resolveUserPlan } from '@/lib/plans/plan-service';
import {
  activateProjectSlots,
  createProject,
  deleteProject,
  listProjects,
  switchProject,
} from '@/lib/project-service';

function handleError(error: unknown, fallback: string): NextResponse {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

  if (message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (message === 'PROJECT_NOT_FOUND') {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }

  if (message === 'INVALID_ACTIVATION') {
    return NextResponse.json({ error: 'Debes seleccionar al menos un proyecto' }, { status: 400 });
  }

  if (isPlanLimitError(error)) {
    return NextResponse.json(planErrorToJson(error), { status: 403 });
  }

  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

function planPayload(plan: Awaited<ReturnType<typeof resolveUserPlan>>) {
  return {
    id: plan.id,
    limits: plan.limits,
    usage: plan.usage,
    subscription: plan.subscription,
  };
}

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const [{ projects, activeProjectId, slots }, plan] = await Promise.all([
      listProjects(uid),
      resolveUserPlan(uid),
    ]);

    return NextResponse.json({
      projects,
      activeProjectId,
      slots,
      plan: planPayload(plan),
    });
  } catch (error) {
    return handleError(error, 'Error al listar proyectos');
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const project = await createProject(uid, body.name);
    const plan = await resolveUserPlan(uid);
    const { slots } = await listProjects(uid);

    return NextResponse.json({
      project,
      activeProjectId: project.id,
      slots,
      plan: planPayload(plan),
    });
  } catch (error) {
    return handleError(error, 'Error al crear proyecto');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = (await request.json()) as {
      projectId?: string;
      action?: 'activate';
      projectIds?: string[];
    };

    if (body.action === 'activate') {
      if (!body.projectIds?.length) {
        return NextResponse.json({ error: 'projectIds es requerido' }, { status: 400 });
      }
      const result = await activateProjectSlots(uid, body.projectIds);
      const plan = await resolveUserPlan(uid);
      return NextResponse.json({
        ...result,
        plan: planPayload(plan),
      });
    }

    if (!body.projectId) {
      return NextResponse.json({ error: 'projectId es requerido' }, { status: 400 });
    }

    const project = await switchProject(uid, body.projectId);
    return NextResponse.json({ project, activeProjectId: project.id });
  } catch (error) {
    return handleError(error, 'Error al actualizar proyectos');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const projectId = new URL(request.url).searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId es requerido' }, { status: 400 });
    }

    const result = await deleteProject(uid, projectId);
    const plan = await resolveUserPlan(uid);

    return NextResponse.json({
      ...result,
      plan: planPayload(plan),
    });
  } catch (error) {
    return handleError(error, 'Error al eliminar el proyecto');
  }
}
