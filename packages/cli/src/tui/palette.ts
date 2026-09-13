export type PaletteCommandId =
  | 'new-story'
  | 'new-epic'
  | 'edit-story'
  | 'change-status'
  | 'delete-story'
  | 'import'
  | 'sprints'
  | 'projects'
  | 'reload'
  | 'theme'
  | 'help';

export type PaletteCommand = {
  id: PaletteCommandId;
  label: string;
  shortcut: string;
  keywords: string;
  enabled: boolean;
};

export function buildPaletteCommands(ctx: {
  hasProject: boolean;
  hasEpic: boolean;
  hasStory: boolean;
  onProjectsScreen: boolean;
}): PaletteCommand[] {
  const { hasProject, hasEpic, hasStory, onProjectsScreen } = ctx;
  return [
    {
      id: 'new-story',
      label: 'Nueva historia',
      shortcut: 'n',
      keywords: 'hu story crear backlog',
      enabled: hasEpic,
    },
    {
      id: 'new-epic',
      label: 'Nueva épica',
      shortcut: 'E',
      keywords: 'epic crear',
      enabled: hasProject,
    },
    {
      id: 'edit-story',
      label: 'Editar historia',
      shortcut: 'e',
      keywords: 'hu editar',
      enabled: hasStory,
    },
    {
      id: 'change-status',
      label: 'Cambiar estado',
      shortcut: 's',
      keywords: 'kanban status todo progreso review',
      enabled: hasStory,
    },
    {
      id: 'delete-story',
      label: 'Eliminar historia',
      shortcut: 'd',
      keywords: 'borrar hu',
      enabled: hasStory,
    },
    {
      id: 'import',
      label: 'Importar backlog',
      shortcut: 'i',
      keywords: 'json importar',
      enabled: hasProject,
    },
    {
      id: 'sprints',
      label: 'Sprints',
      shortcut: 'g',
      keywords: 'sprint plan',
      enabled: hasProject,
    },
    {
      id: 'projects',
      label: 'Proyectos',
      shortcut: 'p',
      keywords: 'hub lista',
      enabled: !onProjectsScreen,
    },
    {
      id: 'reload',
      label: 'Recargar',
      shortcut: 'r',
      keywords: 'refresh recargar backlog',
      enabled: hasProject || onProjectsScreen,
    },
    {
      id: 'theme',
      label: 'Cambiar tema',
      shortcut: 't',
      keywords: 'theme color acento claro oscuro klarify nord catppuccin',
      enabled: true,
    },
    {
      id: 'help',
      label: 'Ayuda de atajos',
      shortcut: '?',
      keywords: 'help atajos teclado',
      enabled: true,
    },
  ];
}

export function filterPaletteCommands(commands: PaletteCommand[], query: string): PaletteCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;
  return commands.filter((command) => {
    const haystack = `${command.label} ${command.shortcut} ${command.keywords}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export function isCtrlP(input: string, key: { ctrl: boolean }): boolean {
  return key.ctrl && (input === 'p' || input === 'P');
}
