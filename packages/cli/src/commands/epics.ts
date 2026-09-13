import { defineCommand } from 'citty';
import { createEpic, deleteEpic, listEpics, updateEpic } from '../core/services';
import { formatArg, out, projectIdFrom, run } from '../run';

export const epicsCommand = defineCommand({
  meta: { description: 'Épicas' },
  default: 'list',
  subCommands: {
    list: defineCommand({
      meta: { description: 'Lista épicas' },
      args: formatArg,
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          const data = await listEpics(projectId);
          const table =
            data.epics
              ?.map((epic) => `${epic.id}  ${epic.title}  (${epic.stories?.length ?? 0})`)
              .join('\n') || '(sin épicas)';
          out(args, data, table);
        });
      },
    }),
    create: defineCommand({
      meta: { description: 'Crea una épica' },
      args: {
        ...formatArg,
        title: { type: 'string', required: true },
        description: { type: 'string', required: true, alias: 'd' },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(
            args,
            await createEpic(projectId, {
              title: String(args.title),
              description: String(args.description),
            })
          );
        });
      },
    }),
    update: defineCommand({
      meta: { description: 'Actualiza título o descripción' },
      args: {
        ...formatArg,
        epicId: { type: 'positional', required: true },
        title: { type: 'string' },
        description: { type: 'string', alias: 'd' },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(
            args,
            await updateEpic(projectId, String(args.epicId), {
              title: args.title ? String(args.title) : undefined,
              description: args.description ? String(args.description) : undefined,
            })
          );
        });
      },
    }),
    delete: defineCommand({
      meta: { description: 'Elimina una épica' },
      args: {
        ...formatArg,
        epicId: { type: 'positional', required: true },
        yes: { type: 'boolean', alias: 'y', description: 'Confirma el borrado' },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(args, await deleteEpic(projectId, String(args.epicId), Boolean(args.yes)));
        });
      },
    }),
  },
});
