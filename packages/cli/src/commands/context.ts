import { defineCommand } from 'citty';
import { getContext, getNext, setStatus } from '../core/services';
import type { KanbanStatus } from '../core/types';
import { formatArg, formatFromArgs, out, projectIdFrom, run } from '../run';

export const contextCommand = defineCommand({
  meta: { description: 'Contexto compacto (o --full) para el agente que codea' },
  args: {
    ...formatArg,
    full: { type: 'boolean', description: 'Export completo JSON/Markdown' },
  },
  async run({ args }) {
    await run(async () => {
      const projectId = await projectIdFrom(args);
      const format = formatFromArgs(args);
      const data = await getContext(projectId, {
        full: Boolean(args.full),
        format: format === 'md' ? 'markdown' : 'json',
      });
      if (format === 'md' && data.content) {
        process.stdout.write(`${data.content}\n`);
        return;
      }
      out(args, args.full ? data : (data.compact ?? data));
    });
  },
});

export const nextCommand = defineCommand({
  meta: { description: 'Siguiente ítem implementable' },
  args: formatArg,
  async run({ args }) {
    await run(async () => {
      const projectId = await projectIdFrom(args);
      out(args, await getNext(projectId));
    });
  },
});

export const statusCommand = defineCommand({
  meta: { description: 'Cambia el estado Kanban de una historia' },
  args: {
    ...formatArg,
    storyId: { type: 'positional', required: true },
    status: {
      type: 'positional',
      required: true,
      description: 'todo | in_progress | code_review | done',
    },
  },
  async run({ args }) {
    await run(async () => {
      const projectId = await projectIdFrom(args);
      out(args, await setStatus(projectId, String(args.storyId), String(args.status) as KanbanStatus));
    });
  },
});
