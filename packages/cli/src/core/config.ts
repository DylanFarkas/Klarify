import { homedir } from 'node:os';
import { join } from 'node:path';
import { chmod, mkdir, readFile, writeFile, rm } from 'node:fs/promises';

export interface KlarifyConfig {
  apiUrl: string;
  token?: string;
  projectId?: string;
}

const CONFIG_DIR = join(homedir(), '.klarify');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

const DEFAULT_API_URL = process.env.KLARIFY_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

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

export async function loadConfig(): Promise<KlarifyConfig> {
  const stored = await readStored();
  return {
    apiUrl: (process.env.KLARIFY_API_URL || stored.apiUrl || DEFAULT_API_URL).replace(/\/$/, ''),
    token: process.env.KLARIFY_TOKEN || stored.token,
    projectId: process.env.KLARIFY_PROJECT || stored.projectId,
  };
}

export async function saveConfig(patch: Partial<KlarifyConfig>): Promise<KlarifyConfig> {
  const stored = await readStored();
  const next: KlarifyConfig = {
    apiUrl: (patch.apiUrl ?? stored.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, ''),
  };
  const token = patch.token !== undefined ? patch.token : stored.token;
  const projectId = patch.projectId !== undefined ? patch.projectId : stored.projectId;
  if (token) next.token = token;
  if (projectId) next.projectId = projectId;

  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  try {
    await chmod(CONFIG_PATH, 0o600);
  } catch {
    // Windows ignora el modo POSIX.
  }
  return loadConfig();
}

export async function clearConfig(): Promise<void> {
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
