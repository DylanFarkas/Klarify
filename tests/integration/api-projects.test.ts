import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/firebase-admin', () => ({
  verifyRequestUser: vi.fn(),
}));

vi.mock('@/lib/project-service', () => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  switchProject: vi.fn(),
  activateProjectSlots: vi.fn(),
}));

vi.mock('@/lib/plans/plan-service', () => ({
  resolveUserPlan: vi.fn(),
}));

import { verifyRequestUser } from '@/lib/firebase-admin';
import { createProject, listProjects } from '@/lib/project-service';
import { resolveUserPlan } from '@/lib/plans/plan-service';
import { PlanLimitError } from '@/lib/plans/plan-errors';
import { GET, POST } from '@/app/api/projects/route';

const mockedVerify = vi.mocked(verifyRequestUser);
const mockedList = vi.mocked(listProjects);
const mockedCreate = vi.mocked(createProject);
const mockedPlan = vi.mocked(resolveUserPlan);

const samplePlan = {
  id: 'free' as const,
  limits: {
    maxProjects: 1,
    maxEpics: 5,
    maxStories: 13,
    maxStoriesPerEpic: 3,
    thinkingBudget: 512,
    backlogDetail: 'compact' as const,
    allowedFileTypes: ['.txt', '.pdf'] as const,
    github: false,
    export: 'manual' as const,
    executionBoard: false,
    maxTeamMembers: 0,
  },
  usage: {
    periodKey: '2026-07',
    regenerations: { agent2: 0, agent3: 0, agent4: 0, agent5: 0 },
  },
  subscription: { planId: 'free' as const, status: 'active' as const },
};

describe('API /api/projects (integración con mocks)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET lista proyectos cuando el usuario está autenticado', async () => {
    mockedVerify.mockResolvedValue('user-1');
    mockedList.mockResolvedValue({
      projects: [
        {
          id: 'p1',
          name: 'Demo',
          status: 'active',
          updatedAt: 1,
          lastAgent: '1',
          pipelineStep: 1,
          pipelineLabel: 'Ingesta de contexto',
          completionPercentage: 0,
        },
      ],
      activeProjectId: 'p1',
      slots: {
        maxActive: 1,
        activeCount: 1,
        lockedCount: 0,
        canChangeSelection: false,
      },
    });
    mockedPlan.mockResolvedValue(samplePlan);

    const request = new NextRequest('http://localhost/api/projects');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.projects).toHaveLength(1);
    expect(body.activeProjectId).toBe('p1');
    expect(body.plan.id).toBe('free');
  });

  it('GET responde 401 si no hay autenticación', async () => {
    mockedVerify.mockRejectedValue(new Error('UNAUTHORIZED'));

    const request = new NextRequest('http://localhost/api/projects');
    const response = await GET(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'No autorizado' });
  });

  it('POST crea un proyecto con nombre', async () => {
    mockedVerify.mockResolvedValue('user-1');
    mockedCreate.mockResolvedValue({
      id: 'p2',
      name: 'Nuevo backlog',
      status: 'active',
      updatedAt: 1,
      lastAgent: '1',
      pipelineStep: 1,
      pipelineLabel: 'Ingesta de contexto',
      completionPercentage: 0,
    });
    mockedPlan.mockResolvedValue(samplePlan);
    mockedList.mockResolvedValue({
      projects: [],
      activeProjectId: 'p2',
      slots: {
        maxActive: 1,
        activeCount: 1,
        lockedCount: 0,
        canChangeSelection: false,
      },
    });

    const request = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Nuevo backlog' }),
      headers: { 'content-type': 'application/json' },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedCreate).toHaveBeenCalledWith('user-1', 'Nuevo backlog');
    expect(body.project.name).toBe('Nuevo backlog');
  });

  it('POST responde 403 al superar el límite del plan', async () => {
    mockedVerify.mockResolvedValue('user-1');
    mockedCreate.mockRejectedValue(
      new PlanLimitError('Límite alcanzado', 'PLAN_PROJECT_LIMIT', { upgradeTo: 'starter' })
    );

    const request = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Extra' }),
      headers: { 'content-type': 'application/json' },
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: 'PLAN_PROJECT_LIMIT',
      upgradeTo: 'starter',
    });
  });
});
