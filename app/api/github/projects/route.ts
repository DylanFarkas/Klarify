import { type NextRequest, NextResponse } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { handleApiError } from '@/lib/api-error';
import { getGithubIntegration } from '@/lib/github-integration';
import { listProjectsForOwner, getRepositoryInfo } from '@/lib/github/projects-service';
import { parseRepoFullName } from '@/lib/github/rest-client';
import { assertGithubExportAllowed } from '@/lib/plans/github-guard';

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    await assertGithubExportAllowed(uid);

    const integration = await getGithubIntegration(uid);
    if (!integration?.accessToken) {
      return NextResponse.json({ error: 'GitHub no conectado' }, { status: 401 });
    }

    const repoFullName = request.nextUrl.searchParams.get('repoFullName');
    let ownerLogin = request.nextUrl.searchParams.get('owner') ?? integration.username;
    let ownerType: 'User' | 'Organization' = 'User';

    if (repoFullName) {
      const { owner, repo } = parseRepoFullName(repoFullName);
      const repoInfo = await getRepositoryInfo(integration.accessToken, owner, repo);
      ownerLogin = repoInfo.ownerLogin;
      ownerType = repoInfo.ownerType;
    }

    const projects = await listProjectsForOwner(
      integration.accessToken,
      ownerLogin,
      ownerType
    );

    return NextResponse.json({ projects, owner: ownerLogin, ownerType });
  } catch (error) {
    return handleApiError(error, 'Error al listar GitHub Projects');
  }
}
