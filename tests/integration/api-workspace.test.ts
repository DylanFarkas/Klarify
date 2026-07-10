import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { makeEmptyWorkspace, samplePlanFree } from '../helpers/fixtures';

vi.mock('@/lib/firebase-admin', () => ({
  verifyRequestUser: vi.fn(),
}));

vi.mock('@/lib/workspace-service', () => ({
  getWorkspaceData: vi.fn(),
  saveAgent1State: vi.fn(),
  saveAgent2State: vi.fn(),
  saveAgent3State: vi.fn(),
  saveAgent4State: vi.fn(),
  saveAgent5State: vi.fn(),
  saveLastAgent: vi.fn(),
  approveAgent1: vi.fn(),
  approveAgent2: vi.fn(),
  approveAgent3: vi.fn(),
  approveAgent4: vi.fn(),
  approveAgent5: vi.fn(),
  createUserStoryAcrossWorkspace: vi.fn(),
  deleteUserStoryAcrossWorkspace: vi.fn(),
  updateUserStoryAcrossWorkspace: vi.fn(),
  updateSprintPlanAcrossWorkspace: vi.fn(),
  resetAgent1: vi.fn(),
  resetAgent2: vi.fn(),
  resetAgent3: vi.fn(),
  resetAgent4: vi.fn(),
  resetAgent5: vi.fn(),
  resetWorkspace: vi.fn(),
  ensureExecutionInitialized: vi.fn(),
  upsertProjectMember: vi.fn(),
  deleteProjectMember: vi.fn(),
  updateStoryExecution: vi.fn(),
  bulkUpdateStoryExecutions: vi.fn(),
  updateExecutionSprintFilter: vi.fn(),
}));

import { verifyRequestUser } from '@/lib/firebase-admin';
import { getWorkspaceData, saveLastAgent } from '@/lib/workspace-service';
import { GET, PATCH } from '@/app/api/workspace/route';

const mockedVerify = vi.mocked(verifyRequestUser);
const mockedGet = vi.mocked(getWorkspaceData);
const mockedSaveLast = vi.mocked(saveLastAgent);

describe('API /api/workspace (integración con mocks)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET responde 401 sin autenticación', async () => {
    mockedVerify.mockRejectedValue(new Error('UNAUTHORIZED'));
    const response = await GET(new NextRequest('http://localhost/api/workspace'));
    expect(response.status).toBe(401);
  });

  it('GET devuelve workspace y preferencias', async () => {
    mockedVerify.mockResolvedValue('user-1');
    mockedGet.mockResolvedValue({
      workspace: makeEmptyWorkspace(),
      preferences: { lastAgent: '2' },
      activeProjectId: 'p1',
      plan: samplePlanFree,
    } as never);

    const response = await GET(new NextRequest('http://localhost/api/workspace'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences.lastAgent).toBe('2');
    expect(body.activeProjectId).toBe('p1');
    expect(body.workspace.agent1.status).toBe('idle');
  });

  it('PATCH guarda preferencias lastAgent', async () => {
    mockedVerify.mockResolvedValue('user-1');
    mockedSaveLast.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/workspace', {
      method: 'PATCH',
      body: JSON.stringify({ preferences: { lastAgent: '3' } }),
      headers: { 'content-type': 'application/json' },
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedSaveLast).toHaveBeenCalledWith('user-1', '3');
    expect(body).toEqual({ ok: true });
  });
});
