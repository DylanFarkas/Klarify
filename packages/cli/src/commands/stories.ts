import { defineCommand } from 'citty';
import { createStory, deleteStory, getStory, listStories, updateStory } from '../core/services';
import type { WorkItemType } from '../core/types';
import { formatArg, out, projectIdFrom, run, parseAcceptanceCriteria, splitDelimited, splitList } from '../run';

export const storiesCommand = defineCommand({
  meta: { description: 'Historias, bugs y tasks' },
  default: 'list',
  subCommands: {
    list: defineCommand({
      meta: { description: 'Lista historias' },
      args: formatArg,
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          const data = await listStories(projectId);
          const table =
            data.stories
              ?.map(
                (story) =>
                  `${story.id}  ${story.status ?? 'todo'}  ${story.epicId}  ${story.title}`
              )
              .join('\n') || '(sin historias)';
          out(args, data, table);
        });
      },
    }),
    get: defineCommand({
      meta: { description: 'Detalle de una historia' },
      args: {
        ...formatArg,
        storyId: { type: 'positional', required: true },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(args, await getStory(projectId, String(args.storyId)));
        });
      },
    }),
    create: defineCommand({
      meta: { description: 'Crea HU, bug o task' },
      args: {
        ...formatArg,
        epic: { type: 'string', required: true, description: 'EPIC-001' },
        title: { type: 'string', required: true },
        description: { type: 'string', required: true, alias: 'd' },
        type: { type: 'string', description: 'story | bug | task', default: 'story' },
        ac: {
          type: 'string',
          description:
            'Un criterio completo (Gherkin en una sola cadena). Varios criterios: separar con ;;',
        },
        subtasks: {
          type: 'string',
          description: 'Subtareas de implementación (ST-xxx), separadas por ;;',
        },
        points: { type: 'string' },
        duration: { type: 'string' },
        category: {
          type: 'string',
          description: 'Prioridad: must|should|could|wont (MoSCoW) u otra del framework activo',
        },
        sprint: { type: 'string' },
        severity: { type: 'string' },
        steps: { type: 'string', description: 'Pasos de bug separados por |' },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          const type = String(args.type ?? 'story') as WorkItemType;
          const acceptanceCriteria = parseAcceptanceCriteria(args.ac);
          if (type === 'story' && acceptanceCriteria.length === 0) {
            throw new Error(
              'Las historias necesitan --ac con al menos un criterio completo (Gherkin en un solo texto).'
            );
          }
          const subtasks = splitDelimited(args.subtasks);
          const stepsToReproduce = splitList(args.steps);
          if (type === 'bug' && stepsToReproduce.length === 0) {
            throw new Error('Los bugs necesitan --steps "paso 1|paso 2".');
          }
          out(
            args,
            await createStory(projectId, {
              epicId: String(args.epic),
              title: String(args.title),
              description: String(args.description),
              type,
              acceptanceCriteria,
              subtasks: subtasks.length > 0 ? subtasks : undefined,
              points: args.points ? Number(args.points) : undefined,
              duration: args.duration ? String(args.duration) : undefined,
              category: args.category ? String(args.category) : undefined,
              sprintId: args.sprint ? String(args.sprint) : undefined,
              severity: args.severity ? String(args.severity) : undefined,
              stepsToReproduce: type === 'bug' ? stepsToReproduce : undefined,
            })
          );
        });
      },
    }),
    update: defineCommand({
      meta: { description: 'Actualiza una historia' },
      args: {
        ...formatArg,
        storyId: { type: 'positional', required: true },
        title: { type: 'string' },
        description: { type: 'string', alias: 'd' },
        ac: {
          type: 'string',
          description: 'Criterio(s) completo(s); varios separados por ;;',
        },
        subtasks: { type: 'string', description: 'Reemplazo de subtareas, separadas por ;;' },
        points: { type: 'string' },
        duration: { type: 'string' },
        category: { type: 'string' },
        sprint: { type: 'string' },
        epic: { type: 'string' },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(
            args,
            await updateStory(projectId, String(args.storyId), {
              title: args.title ? String(args.title) : undefined,
              description: args.description ? String(args.description) : undefined,
              acceptanceCriteria:
                typeof args.ac === 'string' ? parseAcceptanceCriteria(args.ac) : undefined,
              subtasks: typeof args.subtasks === 'string' ? splitDelimited(args.subtasks) : undefined,
              points: args.points ? Number(args.points) : undefined,
              duration: args.duration ? String(args.duration) : undefined,
              category: args.category ? String(args.category) : undefined,
              sprintId: args.sprint === '' ? null : args.sprint ? String(args.sprint) : undefined,
              epicId: args.epic ? String(args.epic) : undefined,
            })
          );
        });
      },
    }),
    delete: defineCommand({
      meta: { description: 'Elimina una historia' },
      args: {
        ...formatArg,
        storyId: { type: 'positional', required: true },
        yes: { type: 'boolean', alias: 'y' },
      },
      async run({ args }) {
        await run(async () => {
          const projectId = await projectIdFrom(args);
          out(args, await deleteStory(projectId, String(args.storyId), Boolean(args.yes)));
        });
      },
    }),
  },
});
