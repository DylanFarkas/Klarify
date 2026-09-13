/**
 * @fileoverview API de plataforma Klarify — /api/v1/*
 *
 * Superficie HTTP para el CLI y agentes de código. No envuelve a Klark.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { parseApiBody } from '@/lib/schemas/parse';
import { platformErrorResponse, platformInvalid, platformNotFound } from '@/lib/platform/errors';
import {
  backlogImportBodySchema,
  confirmQuery,
  deviceAuthorizeBodySchema,
  epicCreateBodySchema,
  epicPatchBodySchema,
  projectCreateBodySchema,
  sprintCompleteBodySchema,
  sprintCreateBodySchema,
  sprintPatchBodySchema,
  stackPutBodySchema,
  storyCreateBodySchema,
  storyPatchBodySchema,
  storyStatusBodySchema,
  subtaskCreateBodySchema,
  subtaskPatchBodySchema,
  tokenCreateBodySchema,
} from '@/lib/platform/schemas';
import * as ops from '@/lib/platform/operations';
import { normalizeSubtasks } from '@/lib/utils/work-item-validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteCtx = { params: Promise<{ path?: string[] | null }> };

function segmentsOf(path: string[] | null | undefined): string[] {
  return (path ?? []).filter(Boolean);
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function requireUser(request: NextRequest): Promise<string> {
  return verifyRequestUser(request);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function match(
  method: string,
  parts: string[],
  expectedMethod: string,
  ...pattern: string[]
): Record<string, string> | null {
  if (method !== expectedMethod) return null;
  if (parts.length !== pattern.length) return null;
  const captured: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i += 1) {
    const token = pattern[i];
    if (token.startsWith(':')) {
      captured[token.slice(1)] = decodeURIComponent(parts[i]);
    } else if (token !== parts[i]) {
      return null;
    }
  }
  return captured;
}

async function dispatch(request: NextRequest, parts: string[]): Promise<NextResponse> {
  const method = request.method.toUpperCase();
  const url = request.nextUrl;

  if (match(method, parts, 'POST', 'auth', 'device') && !url.searchParams.get('device_code')) {
    return json(await ops.platformStartDevice(request));
  }

  const poll = match(method, parts, 'GET', 'auth', 'device');
  if (poll) {
    const deviceCode = url.searchParams.get('device_code') ?? '';
    if (!deviceCode) throw platformInvalid('Falta device_code.');
    return json(await ops.platformPollDevice(deviceCode));
  }

  const authorize = match(method, parts, 'POST', 'auth', 'device', 'authorize');
  if (authorize) {
    const uid = await requireUser(request);
    const body = parseApiBody(deviceAuthorizeBodySchema, await readJson(request));
    return json(await ops.platformAuthorizeDevice(uid, body.userCode));
  }

  const uid = await requireUser(request);

  if (match(method, parts, 'GET', 'me')) {
    return json(await ops.platformWhoami(uid));
  }

  if (match(method, parts, 'GET', 'tokens')) {
    return json({ tokens: await ops.platformListTokens(uid) });
  }
  if (match(method, parts, 'POST', 'tokens')) {
    const body = parseApiBody(tokenCreateBodySchema, await readJson(request));
    const created = await ops.platformCreateToken(uid, body.name);
    return json(created, 201);
  }
  const revoke = match(method, parts, 'DELETE', 'tokens', ':id');
  if (revoke) {
    return json(await ops.platformRevokeToken(uid, revoke.id));
  }

  if (match(method, parts, 'GET', 'projects')) {
    return json(await ops.platformListProjects(uid));
  }
  if (match(method, parts, 'POST', 'projects')) {
    const body = parseApiBody(projectCreateBodySchema, await readJson(request));
    return json(await ops.platformCreateProject(uid, body.name), 201);
  }

  const useProject = match(method, parts, 'POST', 'projects', ':projectId', 'use');
  if (useProject) {
    return json(await ops.platformUseProject(uid, useProject.projectId));
  }

  const ctx = match(method, parts, 'GET', 'projects', ':projectId', 'context');
  if (ctx) {
    const full = url.searchParams.get('full') === '1' || url.searchParams.get('full') === 'true';
    const format = url.searchParams.get('format') === 'markdown' ? 'markdown' : 'json';
    return json(await ops.platformContext(uid, ctx.projectId, { full, format }));
  }

  const nextItem = match(method, parts, 'GET', 'projects', ':projectId', 'next');
  if (nextItem) {
    return json(await ops.platformNext(uid, nextItem.projectId));
  }

  const listBacklog = match(method, parts, 'GET', 'projects', ':projectId', 'backlog');
  if (listBacklog) {
    return json(await ops.platformListBacklog(uid, listBacklog.projectId));
  }
  const importBacklog = match(method, parts, 'POST', 'projects', ':projectId', 'backlog', 'import');
  if (importBacklog) {
    const body = parseApiBody(backlogImportBodySchema, await readJson(request));
    return json(await ops.platformImportBacklog(uid, importBacklog.projectId, body), 201);
  }

  const listEpics = match(method, parts, 'GET', 'projects', ':projectId', 'epics');
  if (listEpics) {
    const backlog = await ops.platformListBacklog(uid, listEpics.projectId);
    return json({ epics: backlog.epics });
  }
  const createEpic = match(method, parts, 'POST', 'projects', ':projectId', 'epics');
  if (createEpic) {
    const body = parseApiBody(epicCreateBodySchema, await readJson(request));
    return json(await ops.platformCreateEpic(uid, createEpic.projectId, body), 201);
  }
  const patchEpic = match(method, parts, 'PATCH', 'projects', ':projectId', 'epics', ':epicId');
  if (patchEpic) {
    const body = parseApiBody(epicPatchBodySchema, await readJson(request));
    return json(await ops.platformUpdateEpic(uid, patchEpic.projectId, patchEpic.epicId, body));
  }
  const deleteEpic = match(method, parts, 'DELETE', 'projects', ':projectId', 'epics', ':epicId');
  if (deleteEpic) {
    return json(
      await ops.platformDeleteEpic(uid, deleteEpic.projectId, deleteEpic.epicId, confirmQuery(url))
    );
  }

  const listStories = match(method, parts, 'GET', 'projects', ':projectId', 'stories');
  if (listStories) {
    return json(await ops.platformListStories(uid, listStories.projectId));
  }
  const createStory = match(method, parts, 'POST', 'projects', ':projectId', 'stories');
  if (createStory) {
    const body = parseApiBody(storyCreateBodySchema, await readJson(request));
    return json(
      await ops.platformCreateStory(uid, createStory.projectId, {
        epicId: body.epicId,
        type: body.type,
        title: body.title ?? '',
        description: body.description ?? '',
        acceptanceCriteria: body.acceptanceCriteria ?? [],
        subtasks: body.subtasks !== undefined ? normalizeSubtasks(body.subtasks) : undefined,
        severity: body.severity,
        stepsToReproduce: body.stepsToReproduce,
        technicalNotes: body.technicalNotes,
        points: body.points,
        durationLabel: body.duration ?? body.durationLabel,
        category: body.category,
        sprintId: body.sprintId,
      }),
      201
    );
  }
  const getStory = match(method, parts, 'GET', 'projects', ':projectId', 'stories', ':storyId');
  if (getStory) {
    return json(await ops.platformGetStory(uid, getStory.projectId, getStory.storyId));
  }
  const patchStory = match(method, parts, 'PATCH', 'projects', ':projectId', 'stories', ':storyId');
  if (patchStory) {
    const body = parseApiBody(storyPatchBodySchema, await readJson(request));
    return json(await ops.platformUpdateStory(uid, patchStory.projectId, patchStory.storyId, body));
  }
  const deleteStory = match(method, parts, 'DELETE', 'projects', ':projectId', 'stories', ':storyId');
  if (deleteStory) {
    return json(
      await ops.platformDeleteStory(
        uid,
        deleteStory.projectId,
        deleteStory.storyId,
        confirmQuery(url)
      )
    );
  }

  const storyStatus = match(
    method,
    parts,
    'POST',
    'projects',
    ':projectId',
    'stories',
    ':storyId',
    'status'
  );
  if (storyStatus) {
    const body = parseApiBody(storyStatusBodySchema, await readJson(request));
    return json(
      await ops.platformSetStatus(uid, storyStatus.projectId, storyStatus.storyId, body.status)
    );
  }

  const addSubtask = match(
    method,
    parts,
    'POST',
    'projects',
    ':projectId',
    'stories',
    ':storyId',
    'subtasks'
  );
  if (addSubtask) {
    const body = parseApiBody(subtaskCreateBodySchema, await readJson(request));
    return json(
      await ops.platformCreateSubtask(uid, addSubtask.projectId, addSubtask.storyId, body.title),
      201
    );
  }
  const patchSubtask = match(
    method,
    parts,
    'PATCH',
    'projects',
    ':projectId',
    'stories',
    ':storyId',
    'subtasks',
    ':subtaskId'
  );
  if (patchSubtask) {
    const body = parseApiBody(subtaskPatchBodySchema, await readJson(request));
    return json(
      await ops.platformUpdateSubtask(
        uid,
        patchSubtask.projectId,
        patchSubtask.storyId,
        patchSubtask.subtaskId,
        body
      )
    );
  }
  const deleteSubtask = match(
    method,
    parts,
    'DELETE',
    'projects',
    ':projectId',
    'stories',
    ':storyId',
    'subtasks',
    ':subtaskId'
  );
  if (deleteSubtask) {
    return json(
      await ops.platformDeleteSubtask(
        uid,
        deleteSubtask.projectId,
        deleteSubtask.storyId,
        deleteSubtask.subtaskId
      )
    );
  }

  const listSprints = match(method, parts, 'GET', 'projects', ':projectId', 'sprints');
  if (listSprints) {
    const backlog = await ops.platformListBacklog(uid, listSprints.projectId);
    return json({ sprints: backlog.sprints, unassignedStoryIds: backlog.unassignedStoryIds });
  }
  const createSprint = match(method, parts, 'POST', 'projects', ':projectId', 'sprints');
  if (createSprint) {
    const body = parseApiBody(sprintCreateBodySchema, await readJson(request));
    return json(await ops.platformCreateSprint(uid, createSprint.projectId, body.goal), 201);
  }
  const patchSprint = match(method, parts, 'PATCH', 'projects', ':projectId', 'sprints', ':sprintId');
  if (patchSprint) {
    const body = parseApiBody(sprintPatchBodySchema, await readJson(request));
    return json(
      await ops.platformUpdateSprint(uid, patchSprint.projectId, patchSprint.sprintId, body)
    );
  }
  const startSprint = match(
    method,
    parts,
    'POST',
    'projects',
    ':projectId',
    'sprints',
    ':sprintId',
    'start'
  );
  if (startSprint) {
    return json(await ops.platformStartSprint(uid, startSprint.projectId, startSprint.sprintId));
  }
  const completeSprint = match(
    method,
    parts,
    'POST',
    'projects',
    ':projectId',
    'sprints',
    ':sprintId',
    'complete'
  );
  if (completeSprint) {
    const body = parseApiBody(sprintCompleteBodySchema, await readJson(request));
    return json(
      await ops.platformCompleteSprint(
        uid,
        completeSprint.projectId,
        completeSprint.sprintId,
        body.rollover
      )
    );
  }
  const deleteSprint = match(
    method,
    parts,
    'DELETE',
    'projects',
    ':projectId',
    'sprints',
    ':sprintId'
  );
  if (deleteSprint) {
    return json(
      await ops.platformDeleteSprint(
        uid,
        deleteSprint.projectId,
        deleteSprint.sprintId,
        confirmQuery(url)
      )
    );
  }

  const getStack = match(method, parts, 'GET', 'projects', ':projectId', 'stack');
  if (getStack) {
    return json(await ops.platformGetStack(uid, getStack.projectId));
  }
  const putStack = match(method, parts, 'PUT', 'projects', ':projectId', 'stack');
  if (putStack) {
    const body = parseApiBody(stackPutBodySchema, await readJson(request));
    return json(await ops.platformSaveStack(uid, putStack.projectId, body));
  }

  throw platformNotFound(`Ruta no encontrada: ${method} /api/v1/${parts.join('/')}`, 'NOT_FOUND');
}

async function handle(request: NextRequest, ctx: RouteCtx): Promise<NextResponse> {
  try {
    const { path } = await ctx.params;
    return await dispatch(request, segmentsOf(path));
  } catch (error) {
    return platformErrorResponse(error, 'Error en la API de plataforma');
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
