import { homedir } from 'node:os';
import { join } from 'node:path';
import { chmod, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_TUI_ACCENT,
  DEFAULT_TUI_THEME,
  resolveAgentTheme,
  resolveKlarifyAccent,
  type AgentTheme,
  type KlarifyAccent,
} from './theme-ids';

export interface KlarifyConfig {
  apiUrl: string;
  token?: string;
  projectId?: string;
  theme?: AgentTheme;
  klarifyAccent?: KlarifyAccent;
}

const CONFIG_DIR = join(homedir(), '.klarify');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

const DEFAULT_API_URL = process.env.KLARIFY_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

let storedCache: Partial<KlarifyConfig> | null = null;
let storedCachePromise: Promise<Partial<KlarifyConfig>> | null = null;

function applyEnv(stored: Partial<KlarifyConfig>): KlarifyConfig {
  return {
    apiUrl: (process.env.KLARIFY_API_URL || stored.apiUrl || DEFAULT_API_URL).replace(/\/$/, ''),
    token: process.env.KLARIFY_TOKEN || stored.token,
    projectId: process.env.KLARIFY_PROJECT || stored.projectId,
    theme: stored.theme ? resolveAgentTheme(stored.theme) : undefined,
    klarifyAccent: stored.klarifyAccent ? resolveKlarifyAccent(stored.klarifyAccent) : undefined,
  };
}

function invalidateConfigCache() {
  storedCache = null;
  storedCachePromise = null;
}

export function configPath(): string {
  return CONFIG_PATH;
}

async function readStored(): Promise<Partial<KlarifyConfig>> {
  try {
    return JSON.parse(await readFile(CONFIG_PATH, 'utf8')) as Partial<KlarifyConfig>;
  } catch {
    return {};
  }
}

async function readStoredCached(): Promise<Partial<KlarifyConfig>> {
  if (storedCache) return storedCache;
  if (storedCachePromise) return storedCachePromise;
  storedCachePromise = readStored().then((stored) => {
    storedCache = stored;
    storedCachePromise = null;
    return stored;
  });
  return storedCachePromise;
}

export function peekAppearance(): { theme: AgentTheme; klarifyAccent: KlarifyAccent } {
  try {
    const stored =
      storedCache ?? (JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as Partial<KlarifyConfig>);
    return {
      theme: resolveAgentTheme(stored.theme),
      klarifyAccent: resolveKlarifyAccent(stored.klarifyAccent),
    };
  } catch {
    return { theme: DEFAULT_TUI_THEME, klarifyAccent: DEFAULT_TUI_ACCENT };
  }
}

export async function loadConfig(): Promise<KlarifyConfig> {
  return applyEnv(await readStoredCached());
}

export async function saveConfig(patch: Partial<KlarifyConfig>): Promise<KlarifyConfig> {
  const stored = await readStoredCached();
  const next: KlarifyConfig = {
    apiUrl: (patch.apiUrl ?? stored.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, ''),
  };
  const token = patch.token !== undefined ? patch.token : stored.token;
  const projectId = patch.projectId !== undefined ? patch.projectId : stored.projectId;
  const theme = patch.theme !== undefined ? patch.theme : stored.theme;
  const klarifyAccent = patch.klarifyAccent !== undefined ? patch.klarifyAccent : stored.klarifyAccent;
  if (token) next.token = token;
  if (projectId) next.projectId = projectId;
  if (theme) next.theme = resolveAgentTheme(theme);
  if (klarifyAccent) next.klarifyAccent = resolveKlarifyAccent(klarifyAccent);

  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  try {
    await chmod(CONFIG_PATH, 0o600);
  } catch {
    // Windows ignora el modo POSIX.
  }
  storedCache = next;
  storedCachePromise = null;
  return applyEnv(next);
}

export async function clearConfig(): Promise<void> {
  invalidateConfigCache();
  await rm(CONFIG_PATH, { force: true });
}

export function requireToken(config: KlarifyConfig): string {
  if (!config.token) {
    throw new Error('No hay sesión. Ejecuta `klarify login` o exporta KLARIFY_TOKEN.');
  }
  return config.token;
}

export function requireProject(config: KlarifyConfig, flag?: string): string {
  const projectId = flag || config.projectId;
  if (!projectId) {
    throw new Error('Indica un proyecto con --project, `klarify use <id>` o KLARIFY_PROJECT.');
  }
  return projectId;
}
