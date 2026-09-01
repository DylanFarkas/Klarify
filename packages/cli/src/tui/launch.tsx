import { render } from 'ink';
import { requireInteractiveTty, tuiBlockedReason } from './detect';
import { App } from './App';

export async function launchTui(): Promise<void> {
  const blocked = tuiBlockedReason();
  if (blocked) throw new Error(blocked);
  requireInteractiveTty();
  const instance = render(<App />, {
    alternateScreen: true,
    exitOnCtrlC: true,
  });
  await instance.waitUntilExit();
}
