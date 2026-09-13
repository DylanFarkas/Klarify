import { render } from 'ink';
import { requireInteractiveTty, tuiBlockedReason } from './detect';
import { App } from './App';
import { ThemeProvider } from './ThemeContext';

export async function launchTui(): Promise<void> {
  const blocked = tuiBlockedReason();
  if (blocked) throw new Error(blocked);
  requireInteractiveTty();
  const instance = render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
    {
    alternateScreen: true,
    exitOnCtrlC: true,
  });
  await instance.waitUntilExit();
}
