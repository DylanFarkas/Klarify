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
import { parseApiBody, isApiBodyError, isZodError, firstZodErrorMessage } from '@/lib/schemas/parse';
import {
  projectsCreateBodySchema,
  projectsPatchBodySchema,
} from '@/lib/schemas/misc-api';

function handleError(error: unknown, fallback: string): NextResponse {
  if (isZodError(error)) {
    return NextResponse.json({ error: firstZodErrorMessage(error) }, { status: 400 });
  }
  if (isApiBodyError(error)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

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

  if (message === 'PROJECT_NAME_REQUIRED') {
    return NextResponse.json({ error: 'El nombre del proyecto es obligatorio' }, { status: 400 });
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
    const { projects, activeProjectId, slots, plan } = await listProjects(uid);

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
    const body = parseApiBody(
      projectsCreateBodySchema,
      await request.json().catch(() => ({}))
    );
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
    const body = parseApiBody(projectsPatchBodySchema, await request.json());

    if ('action' in body && body.action === 'activate') {
      const result = await activateProjectSlots(uid, body.projectIds);
      const plan = await resolveUserPlan(uid);
      return NextResponse.json({
        ...result,
        plan: planPayload(plan),
      });
    }

    if (!('projectId' in body)) {
      return NextResponse.json({ error: 'projectId es requerido' }, { status: 400 });
    }

    const result = await switchProject(uid, body.projectId);
    return NextResponse.json({
      project: result.project,
      activeProjectId: result.project.id,
      workspace: result.workspace,
      preferences: result.preferences,
      plan: planPayload(result.plan),
    });
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
