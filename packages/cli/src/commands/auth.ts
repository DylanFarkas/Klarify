import { defineCommand } from 'citty';
import { clearConfig, configPath, loadConfig } from '../core/config';
import {
  finishDeviceLogin,
  loginWithToken,
  pollDeviceLogin,
  startDeviceLogin,
  useProject,
  whoami,
} from '../core/services';
import { formatArg, out, run } from '../run';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const loginCommand = defineCommand({
  meta: { description: 'Inicia sesión (device flow o --token)' },
  args: {
    token: { type: 'string', description: 'PAT klf_… generado en la web' },
    apiUrl: { type: 'string', description: 'URL de la API (default KLARIFY_API_URL o localhost:3000)' },
  },
  async run({ args }) {
    await run(async () => {
      const apiUrl = (args.apiUrl as string | undefined) || (await loadConfig()).apiUrl;
      if (args.token) {
        await loginWithToken(String(args.token), apiUrl);
        process.stdout.write(`Sesión guardada en ${configPath()}\n`);
        return;
      }
      const started = await startDeviceLogin(apiUrl);
      process.stderr.write(`Abre ${started.verificationUriComplete}\n`);
      process.stderr.write(`Código: ${started.userCode}\n`);
      const deadline = Date.now() + started.expiresIn * 1000;
      while (Date.now() < deadline) {
        await sleep((started.interval || 3) * 1000);
        const poll = await pollDeviceLogin(apiUrl, started.deviceCode);
        if (poll.status === 'authorized' && poll.token) {
          await finishDeviceLogin(apiUrl, poll.token);
          process.stdout.write(`Sesión guardada en ${configPath()}\n`);
          return;
        }
        if (poll.status === 'expired') {
          throw new Error('El código caducó. Ejecuta klarify login otra vez.');
        }
      }
      throw new Error('Tiempo de espera agotado.');
    });
  },
});

export const logoutCommand = defineCommand({
  meta: { description: 'Borra el token local' },
  async run() {
    await clearConfig();
    process.stdout.write('Sesión eliminada.\n');
  },
});

export const whoamiCommand = defineCommand({
  meta: { description: 'Usuario y plan de la sesión' },
  args: { format: formatArg.format, json: formatArg.json },
  async run({ args }) {
    await run(async () => {
      out(args, await whoami());
    });
  },
});

export const useCommand = defineCommand({
  meta: { description: 'Fija el proyecto por defecto' },
  args: {
    projectId: { type: 'positional', required: true, description: 'ID de proyecto' },
  },
  async run({ args }) {
    await run(async () => {
      const projectId = String(args.projectId);
      await useProject(projectId);
      process.stdout.write(`Proyecto activo: ${projectId}\n`);
    });
  },
});
