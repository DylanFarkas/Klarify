export function tuiBlockedReason(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  if (env.KLARIFY_NO_TUI === '1' || env.KLARIFY_NO_TUI === 'true') {
    return 'TUI desactivada (KLARIFY_NO_TUI). Usa subcomandos del CLI.';
  }
  if (env.CI === '1' || env.CI === 'true') {
    return 'TUI desactivada en CI. Usa subcomandos del CLI.';
  }
  return null;
}

/** Abre TUI solo con `klarify` sin args, en TTY interactivo. Nunca si hay subcomando o --help. */
export function shouldLaunchTuiBare(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
  tty: { stdin: boolean; stdout: boolean } = {
    stdin: Boolean(process.stdin.isTTY),
    stdout: Boolean(process.stdout.isTTY),
  }
): boolean {
  if (tuiBlockedReason(env)) return false;
  const raw = argv.slice(2);
  if (raw.some((arg) => arg === '--help' || arg === '-h' || arg === '--version' || arg === '-v')) {
    return false;
  }
  if (raw.length > 0) return false;
  return tty.stdin && tty.stdout;
}

export function requireInteractiveTty(): void {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('La TUI necesita una terminal interactiva. Usa subcomandos del CLI.');
  }
}
