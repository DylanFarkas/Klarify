/**
 * @fileoverview Cliente GraphQL para la API de GitHub.
 */

export class GithubGraphqlError extends Error {
  readonly status?: number;
  readonly errors?: Array<{ message: string; type?: string }>;

  constructor(message: string, options?: { status?: number; errors?: Array<{ message: string; type?: string }> }) {
    super(message);
    this.name = 'GithubGraphqlError';
    this.status = options?.status;
    this.errors = options?.errors;
  }
}

export async function githubGraphql<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string; type?: string }>;
  };

  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.[0]?.message ?? `GitHub GraphQL error (${response.status})`;
    throw new GithubGraphqlError(message, {
      status: response.status,
      errors: payload.errors,
    });
  }

  if (!payload.data) {
    throw new GithubGraphqlError('GitHub GraphQL returned empty data');
  }

  return payload.data;
}

export function isGithubScopeError(error: unknown): boolean {
  if (!(error instanceof GithubGraphqlError)) return false;
  const msg = error.message.toLowerCase();
  return (
    error.status === 403 ||
    msg.includes('resource not accessible') ||
    msg.includes('insufficient scopes') ||
    msg.includes('scope')
  );
}
