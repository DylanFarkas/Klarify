import { defineCommand } from 'citty';
import { getStack, saveStack } from '../core/services';
import { formatArg, out, projectIdFrom, run } from '../run';

export const stackCommand = defineCommand({
  meta: { description: 'Stack tecnológico' },
  default: 'get',
  subCommands: {
    get: defineCommand({
      meta: { description: 'Muestra el stack' },
      args: formatArg,
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(args, await getStack(projectId));
        });
      },
    }),
    set: defineCommand({
      meta: { description: 'Guarda el stack' },
      args: {
        ...formatArg,
        productKind: { type: 'string', required: true },
        architecture: { type: 'string', required: true },
        layers: { type: 'string', required: true, description: 'JSON de capas' },
        rationale: { type: 'string' },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          const layers = JSON.parse(String(args.layers)) as Record<string, unknown>;
          out(
            args,
            await saveStack(projectId, {
              productKind: String(args.productKind),
              architecturePattern: String(args.architecture),
              layers,
              rationale: args.rationale ? String(args.rationale) : undefined,
            })
          );
        });
      },
    }),
  },
});
