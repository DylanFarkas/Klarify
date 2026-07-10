import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEmptyWorkspace } from '../helpers/fixtures';

vi.mock('@/lib/workspace-service', () => ({
  getWorkspaceData: vi.fn(),
}));

vi.mock('@/lib/plans/plan-service', () => ({
  checkAndIncrementRegeneration: vi.fn(),
}));

import { getWorkspaceData } from '@/lib/workspace-service';
import { checkAndIncrementRegeneration } from '@/lib/plans/plan-service';
import { assertAiRegenerationAllowed } from '@/lib/plans/regeneration-guard';

const mockedWorkspace = vi.mocked(getWorkspaceData);
const mockedIncrement = vi.mocked(checkAndIncrementRegeneration);

describe('assertAiRegenerationAllowed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIncrement.mockResolvedValue({ remaining: 2 });
  });

  it('no incrementa en la primera generación (workspace idle)', async () => {
    mockedWorkspace.mockResolvedValue({
      workspace: makeEmptyWorkspace(),
      preferences: { lastAgent: '2' },
      activeProjectId: 'p1',
    } as never);

    await assertAiRegenerationAllowed('u1', 'agent2');
    expect(mockedIncrement).not.toHaveBeenCalled();
  });

  it('incrementa cuando isRegeneration=true', async () => {
    mockedWorkspace.mockResolvedValue({
      workspace: makeEmptyWorkspace(),
      preferences: { lastAgent: '2' },
      activeProjectId: 'p1',
    } as never);

    await assertAiRegenerationAllowed('u1', 'agent2', true);
    expect(mockedIncrement).toHaveBeenCalledWith('u1', 'agent2');
  });

  it('infiere regeneración si ya hay épicas en agent2', async () => {
    mockedWorkspace.mockResolvedValue({
      workspace: makeEmptyWorkspace({
        agent2: {
          input: null,
          epics: [
            {
              id: 'EPIC-001',
              title: 'A',
              description: 'd',
              source: 'auto',
              isEdited: false,
              createdAt: 1,
              userStories: [],
            },
          ],
          status: 'review',
          error: null,
        },
      }),
      preferences: { lastAgent: '2' },
      activeProjectId: 'p1',
    } as never);

    await assertAiRegenerationAllowed('u1', 'agent2');
    expect(mockedIncrement).toHaveBeenCalledWith('u1', 'agent2');
  });
});
