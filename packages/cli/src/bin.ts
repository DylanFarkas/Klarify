#!/usr/bin/env tsx
import { defineCommand, runMain } from 'citty';
import { fail } from './print';
import { ApiError } from './core/client';
import { shouldLaunchTuiBare } from './tui/detect';

const main = defineCommand({
  meta: {
    name: 'klarify',
    version: '0.1.1',
    description:
      'Controla Klarify desde la terminal. TUI para humanos; subcomandos para agentes de código. No es Klark.',
  },
  subCommands: {
    tui: () => import('./commands/tui').then((m) => m.tuiCommand),
    login: () => import('./commands/auth').then((m) => m.loginCommand),
    logout: () => import('./commands/auth').then((m) => m.logoutCommand),
    whoami: () => import('./commands/auth').then((m) => m.whoamiCommand),
    use: () => import('./commands/auth').then((m) => m.useCommand),
    projects: () => import('./commands/projects').then((m) => m.projectsCommand),
    context: () => import('./commands/context').then((m) => m.contextCommand),
    next: () => import('./commands/context').then((m) => m.nextCommand),
    status: () => import('./commands/context').then((m) => m.statusCommand),
    epics: () => import('./commands/epics').then((m) => m.epicsCommand),
    stories: () => import('./commands/stories').then((m) => m.storiesCommand),
    backlog: () => import('./commands/backlog').then((m) => m.backlogCommand),
    subtasks: () => import('./commands/subtasks').then((m) => m.subtasksCommand),
    sprints: () => import('./commands/sprints').then((m) => m.sprintsCommand),
    stack: () => import('./commands/stack').then((m) => m.stackCommand),
    mcp: () => import('./commands/mcp').then((m) => m.mcpCommand),
  },
});

async function start(): Promise<void> {
  if (shouldLaunchTuiBare(process.argv)) {
    const { launchTui } = await import('./tui/launch');
    await launchTui();
    return;
  }
  await runMain(main);
}

void start().catch((error) => {
  fail(error instanceof ApiError ? error : error);
});
