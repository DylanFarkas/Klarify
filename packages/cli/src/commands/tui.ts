import { defineCommand } from 'citty';
import { run } from '../run';

export const tuiCommand = defineCommand({
  meta: {
    description:
      'Interfaz interactiva para humanos. Los agentes deben usar subcomandos (`context`, `status`, `backlog import`).',
  },
  async run() {
    await run(async () => {
      const { launchTui } = await import('../tui/launch');
      await launchTui();
    });
  },
});
