import { defineCommand } from 'citty';
import { saveConfig } from '../core/config';
import { createProject, listProjects } from '../core/services';
import { formatArg, out, run } from '../run';

export const projectsCommand = defineCommand({
  meta: { description: 'Proyectos del workspace' },
  default: 'list',
  subCommands: {
    list: defineCommand({
      meta: { description: 'Lista proyectos' },
      args: { format: formatArg.format, json: formatArg.json },
      async run({ args }) {
        await run(async () => {
          const data = await listProjects();
          const table =
            data.projects
              .map(
                (project) =>
                  `${project.id === data.activeProjectId ? '*' : ' '} ${project.id}  ${project.name}  ${project.pipelineLabel}`
              )
              .join('\n') || '(sin proyectos)';
          out(args, data, table);
        });
      },
    }),
    create: defineCommand({
      meta: { description: 'Crea un proyecto y lo deja activo' },
      args: {
        name: { type: 'positional', required: true, description: 'Nombre' },
        format: formatArg.format,
        json: formatArg.json,
      },
      async run({ args }) {
        await run(async () => {
          const data = await createProject(String(args.name));
          await saveConfig({ projectId: data.project.id });
          out(args, data);
        });
      },
    }),
  },
});
