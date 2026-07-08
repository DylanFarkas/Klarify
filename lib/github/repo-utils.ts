/**
 * @fileoverview Utilidades para nombres de repositorios GitHub.
 */

const REPO_NAME_PATTERN = /^[a-z0-9._-]+$/;

export function slugifyRepoName(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 100);

  return slug || 'klarify-project';
}

export function isValidRepoName(name: string): boolean {
  return name.length >= 1 && name.length <= 100 && REPO_NAME_PATTERN.test(name);
}

export function normalizeRepoName(name: string): string {
  return slugifyRepoName(name.trim());
}
