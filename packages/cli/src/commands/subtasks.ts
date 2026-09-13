import { defineCommand } from 'citty';
import { addSubtask, deleteSubtask, updateSubtask } from '../core/services';
import { formatArg, out, projectIdFrom, run } from '../run';

export const subtasksCommand = defineCommand({
  meta: { description: 'Subtareas ST-xxx' },
  subCommands: {
    add: defineCommand({
      args: {
        ...formatArg,
        storyId: { type: 'positional', required: true },
        title: { type: 'string', required: true },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(args, await addSubtask(projectId, String(args.storyId), String(args.title)));
        });
      },
    }),
    update: defineCommand({
      args: {
        ...formatArg,
        storyId: { type: 'positional', required: true },
        subtaskId: { type: 'positional', required: true },
        title: { type: 'string' },
        done: { type: 'boolean' },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(
            args,
            await updateSubtask(projectId, String(args.storyId), String(args.subtaskId), {
              title: args.title ? String(args.title) : undefined,
              done: typeof args.done === 'boolean' ? args.done : undefined,
            })
          );
        });
      },
    }),
    delete: defineCommand({
      args: {
        ...formatArg,
        storyId: { type: 'positional', required: true },
        subtaskId: { type: 'positional', required: true },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(args, await deleteSubtask(projectId, String(args.storyId), String(args.subtaskId)));
        });
      },
    }),
  },
});
