import { defineCommand } from 'citty';
import {
  completeSprint,
  createSprint,
  deleteSprint,
  listSprints,
  startSprint,
  updateSprint,
} from '../core/services';
import type { SprintRollover } from '../core/types';
import { formatArg, out, projectIdFrom, run } from '../run';

export const sprintsCommand = defineCommand({
  meta: { description: 'Sprints' },
  default: 'list',
  subCommands: {
    list: defineCommand({
      meta: { description: 'Lista sprints' },
      args: formatArg,
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          const data = await listSprints(projectId);
          const table =
            data.sprints
              ?.map((sprint) => `${sprint.id}  ${sprint.status}  ${sprint.goal}`)
              .join('\n') || '(sin sprints)';
          out(args, data, table);
        });
      },
    }),
    create: defineCommand({
      meta: { description: 'Crea un sprint' },
      args: { ...formatArg, goal: { type: 'string' } },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(args, await createSprint(projectId, args.goal ? String(args.goal) : undefined));
        });
      },
    }),
    update: defineCommand({
      meta: { description: 'Actualiza un sprint' },
      args: {
        ...formatArg,
        sprintId: { type: 'positional', required: true },
        goal: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(
            args,
            await updateSprint(projectId, String(args.sprintId), {
              goal: args.goal ? String(args.goal) : undefined,
              startDate: args.startDate ? String(args.startDate) : undefined,
              endDate: args.endDate ? String(args.endDate) : undefined,
            })
          );
        });
      },
    }),
    start: defineCommand({
      meta: { description: 'Inicia un sprint' },
      args: { ...formatArg, sprintId: { type: 'positional', required: true } },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(args, await startSprint(projectId, String(args.sprintId)));
        });
      },
    }),
    complete: defineCommand({
      meta: { description: 'Completa un sprint' },
      args: {
        ...formatArg,
        sprintId: { type: 'positional', required: true },
        rollover: { type: 'string', description: 'backlog | next_planned' },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(
            args,
            await completeSprint(
              projectId,
              String(args.sprintId),
              args.rollover ? (String(args.rollover) as SprintRollover) : undefined
            )
          );
        });
      },
    }),
    delete: defineCommand({
      meta: { description: 'Elimina un sprint vacío' },
      args: {
        ...formatArg,
        sprintId: { type: 'positional', required: true },
        yes: { type: 'boolean', alias: 'y' },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(args, await deleteSprint(projectId, String(args.sprintId), Boolean(args.yes)));
        });
      },
    }),
  },
});
