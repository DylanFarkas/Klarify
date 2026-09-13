/**
 * Lista separada por `;;`. No uses `|` dentro de un criterio Gherkin
 * (Dado/Cuando/Entonces van en un solo string).
 */
export function splitDelimited(value: unknown, separator = ';;'): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Un `--ac` = un criterio completo; varios criterios con `;;` entre ellos. */
export function parseAcceptanceCriteria(value: unknown): string[] {
  return splitDelimited(value, ';;');
}

/** @deprecated Usa splitDelimited o parseAcceptanceCriteria. */
export function splitList(value: unknown): string[] {
  return splitDelimited(value, '|');
}
