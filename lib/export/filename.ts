/**
 * @fileoverview Utilidades para nombres de archivo de exportación.
 */

export function slugifyExportFilename(input: string): string {
  const slug = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'proyecto';
}
