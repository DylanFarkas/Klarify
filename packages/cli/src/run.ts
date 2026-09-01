import { loadConfig, requireProject } from './core/config';
import { parseAcceptanceCriteria, splitDelimited, splitList } from './core/parse';
import { projectPath } from './core/client';
import { fail, printOut, resolveFormat, type OutputFormat } from './print';

export { parseAcceptanceCriteria, splitDelimited, splitList, projectPath };

export const formatArg = {
  format: { type: 'string' as const, description: 'json | md | table', alias: 'f' },
  json: { type: 'boolean' as const, description: 'Fuerza salida JSON (agentes y CI)' },
  project: { type: 'string' as const, description: 'ID de proyecto', alias: 'p' },
};

export function formatFromArgs(args: { format?: unknown; json?: unknown }): OutputFormat {
  if (args.json) return 'json';
  return resolveFormat(typeof args.format === 'string' ? args.format : undefined);
}

export async function projectIdFrom(args: { project?: unknown }): Promise<string> {
  const config = await loadConfig();
  return requireProject(config, typeof args.project === 'string' ? args.project : undefined);
}

export async function run(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    fail(error);
  }
}

export function out(
  args: { format?: unknown; json?: unknown },
  data: unknown,
  table?: string,
  markdown?: string
): void {
  printOut(formatFromArgs(args), data, table, markdown);
}
