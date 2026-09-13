/** Normaliza códigos de device login (`ABCD-WXYZ`). Seguro en client y server. */

export function normalizeUserCode(raw: string): string {
  const alnum = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (alnum.length !== 8) return raw.trim().toUpperCase();
  return `${alnum.slice(0, 4)}-${alnum.slice(4)}`;
}
