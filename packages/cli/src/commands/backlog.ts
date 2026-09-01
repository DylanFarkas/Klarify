import { readFile, rm } from 'node:fs/promises';
import { defineCommand } from 'citty';
import { importBacklog } from '../core/services';
import { formatArg, out, projectIdFrom, run } from '../run';

async function readPayload(filePath: string | undefined): Promise<unknown> {
  if (filePath && filePath !== '-') {
    return JSON.parse(await readFile(filePath, 'utf8')) as unknown;
  }
  if (process.stdin.isTTY) {
    throw new Error(
      'Pasa un JSON con --file backlog.json o redirige stdin: klarify backlog import --file - < backlog.json'
    );
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) throw new Error('stdin vacío. Espera un JSON con { "epics": [...] }.');
  return JSON.parse(raw) as unknown;
}

export const backlogCommand = defineCommand({
  meta: { description: 'Backlog completo (import masivo)' },
  default: 'import',
  subCommands: {
    import: defineCommand({
      meta: {
        description:
          'Crea épicas e historias de una vez (JSON). Preferido frente a stories create uno a uno.',
      },
      args: {
        ...formatArg,
        file: {
          type: 'string',
          alias: 'i',
          description: 'Ruta al JSON. Usa - para stdin.',
        },
        rm: {
          type: 'boolean',
          description: 'Borra el archivo --file tras un import correcto (agentes: siempre).',
        },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          const filePath = typeof args.file === 'string' ? args.file : undefined;
          const payload = await readPayload(filePath);
          out(args, await importBacklog(projectId, payload));
          if (args.rm && filePath && filePath !== '-') {
            await rm(filePath, { force: true });
          }
        });
      },
    }),
  },
});
