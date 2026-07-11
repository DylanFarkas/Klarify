import { type NextRequest, NextResponse } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { handleApiError } from '@/lib/api-error';
import { exportProjectToGithub, mapGithubExportError } from '@/lib/github/export-service';
import { getProjectGithubExport } from '@/lib/project-service';
import type { GithubExportRepoTarget, GithubExportRequest } from '@/lib/types/github-export';
import { createNdjsonStream, ndjsonStreamResponse } from '@/lib/utils/llm-stream';

function resolveRepoTarget(body: GithubExportRequest): GithubExportRepoTarget | null {
  if (body.repo?.mode) {
    return body.repo;
  }
  if (body.repoFullName?.trim()) {
    return { mode: 'existing', fullName: body.repoFullName.trim() };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = (await request.json()) as GithubExportRequest;

    const repo = resolveRepoTarget(body);

    if (!body.projectId || !repo || !body.destination?.mode) {
      return NextResponse.json({ error: 'Datos de exportación incompletos.' }, { status: 400 });
    }

    const existingExport = await getProjectGithubExport(uid, body.projectId);
    const { stream, send, close } = createNdjsonStream();

    void (async () => {
      try {
        const result = await exportProjectToGithub({
          uid,
          projectId: body.projectId,
          repo,
          destination: body.destination,
          options: body.options,
          existingExport,
          onProgress: (event) => {
            send({ type: 'progress', ...event });
          },
        });

        send({ type: 'done', payload: result });
      } catch (error) {
        const mapped = mapGithubExportError(error);
        send({ type: 'error', error: mapped.message, code: mapped.code });
      } finally {
        close();
      }
    })();

    return ndjsonStreamResponse(stream);
  } catch (error) {
    const mapped = mapGithubExportError(error);
    if (mapped.status !== 500) {
      return NextResponse.json({ error: mapped.message, code: mapped.code }, { status: mapped.status });
    }
    return handleApiError(error, 'Error al exportar a GitHub');
  }
}
