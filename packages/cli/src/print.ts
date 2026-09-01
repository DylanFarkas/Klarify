function isTty(): boolean {
  return Boolean(process.stdout.isTTY);
}

export type OutputFormat = 'json' | 'md' | 'table';

export function resolveFormat(flag?: string): OutputFormat {
  if (flag === 'json' || flag === 'md' || flag === 'table') return flag;
  return isTty() ? 'table' : 'json';
}

export function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function printOut(format: OutputFormat, data: unknown, table?: string, markdown?: string): void {
  if (format === 'json') {
    printJson(data);
    return;
  }
  if (format === 'md') {
    process.stdout.write(`${markdown ?? table ?? JSON.stringify(data, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${table ?? JSON.stringify(data, null, 2)}\n`);
}

export function fail(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
