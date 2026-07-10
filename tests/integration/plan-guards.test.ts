import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanLimitError } from '@/lib/plans/plan-errors';
import { samplePlanFree, samplePlanPro } from '../helpers/fixtures';

vi.mock('@/lib/plans/plan-service', () => ({
  resolveUserPlan: vi.fn(),
}));

import { resolveUserPlan } from '@/lib/plans/plan-service';
import { assertProjectExportAllowed } from '@/lib/plans/export-guard';
import { assertGithubExportAllowed } from '@/lib/plans/github-guard';
import {
  assertExecutionBoardAllowed,
  assertTeamMemberLimit,
} from '@/lib/plans/execution-guard';

const mockedPlan = vi.mocked(resolveUserPlan);

describe('guards de plan (export / github / execution)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloquea export en plan free', async () => {
    mockedPlan.mockResolvedValue(samplePlanFree);
    await expect(assertProjectExportAllowed('u1')).rejects.toBeInstanceOf(PlanLimitError);
  });

  it('permite export en plan pro', async () => {
    mockedPlan.mockResolvedValue(samplePlanPro);
    await expect(assertProjectExportAllowed('u1')).resolves.toBeUndefined();
  });

  it('bloquea github fuera de pro', async () => {
    mockedPlan.mockResolvedValue(samplePlanFree);
    await expect(assertGithubExportAllowed('u1')).rejects.toMatchObject({
      code: 'PLAN_FEATURE_GITHUB',
    });
  });

  it('permite github en pro', async () => {
    mockedPlan.mockResolvedValue(samplePlanPro);
    await expect(assertGithubExportAllowed('u1')).resolves.toBeUndefined();
  });

  it('bloquea tablero de ejecución en free', async () => {
    mockedPlan.mockResolvedValue(samplePlanFree);
    await expect(assertExecutionBoardAllowed('u1')).rejects.toMatchObject({
      code: 'PLAN_FEATURE_EXECUTION_BOARD',
    });
  });

  it('permite tablero y valida límite de miembros en pro', async () => {
    mockedPlan.mockResolvedValue(samplePlanPro);
    await expect(assertExecutionBoardAllowed('u1')).resolves.toBeUndefined();
    await expect(assertTeamMemberLimit('u1', 24)).resolves.toBeUndefined();
    await expect(assertTeamMemberLimit('u1', 25)).rejects.toMatchObject({
      code: 'PLAN_TEAM_MEMBER_LIMIT',
    });
  });
});
