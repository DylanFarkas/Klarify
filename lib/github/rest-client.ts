/**
 * @fileoverview Cliente REST para la API de GitHub (issues, milestones, labels).
 */

export interface GithubRestIssue {
  number: number;
  node_id: string;
  html_url: string;
  title: string;
}

export interface GithubRestMilestone {
  number: number;
  title: string;
}

export class GithubRestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GithubRestError';
    this.status = status;
  }
}

const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
} as const;

async function githubRest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...GITHUB_HEADERS,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new GithubRestError(
      body || `GitHub REST error (${response.status})`,
      response.status
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function parseRepoFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) {
    throw new Error('INVALID_REPO_FULL_NAME');
  }
  return { owner, repo };
}

export interface GithubCreatedRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
}

export async function createRepository(
  accessToken: string,
  body: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
  }
): Promise<GithubCreatedRepository> {
  return githubRest(accessToken, '/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: body.name,
      description: body.description,
      private: body.private ?? false,
      auto_init: body.auto_init ?? true,
    }),
  });
}

export async function createIssue(
  accessToken: string,
  owner: string,
  repo: string,
  body: {
    title: string;
    body: string;
    labels?: string[];
    milestone?: number;
  }
): Promise<GithubRestIssue> {
  return githubRest(accessToken, `/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function updateIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: {
    title?: string;
    body?: string;
    labels?: string[];
    milestone?: number | null;
  }
): Promise<GithubRestIssue> {
  return githubRest(accessToken, `/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function createMilestone(
  accessToken: string,
  owner: string,
  repo: string,
  body: { title: string; description?: string; due_on?: string }
): Promise<GithubRestMilestone> {
  return githubRest(accessToken, `/repos/${owner}/${repo}/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function listMilestones(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GithubRestMilestone[]> {
  return githubRest(accessToken, `/repos/${owner}/${repo}/milestones?state=all&per_page=100`);
}

export async function ensureLabel(
  accessToken: string,
  owner: string,
  repo: string,
  name: string,
  color = '1d76db'
): Promise<void> {
  try {
    await githubRest(accessToken, `/repos/${owner}/${repo}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
  } catch (error) {
    if (error instanceof GithubRestError && error.status === 422) {
      return;
    }
    throw error;
  }
}

export async function addSubIssue(
  accessToken: string,
  owner: string,
  repo: string,
  parentIssueNumber: number,
  subIssueId: number
): Promise<void> {
  try {
    await githubRest(
      accessToken,
      `/repos/${owner}/${repo}/issues/${parentIssueNumber}/sub_issues`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({ sub_issue_id: subIssueId }),
      }
    );
  } catch {
    // Sub-issues API may be unavailable; caller falls back to labels/body reference.
  }
}

export async function verifyRepoWriteAccess(
  accessToken: string,
  owner: string,
  repo: string
): Promise<void> {
  const data = await githubRest<{ permissions?: { push?: boolean } }>(
    accessToken,
    `/repos/${owner}/${repo}`
  );
  if (!data.permissions?.push) {
    throw new GithubRestError('No write access', 403);
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
