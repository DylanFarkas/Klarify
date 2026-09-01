import { Box, Text, useInput } from 'ink';
import { colors } from '../theme';

const LINES = [
  ['tab / j k', 'Cambiar panel y mover listas'],
  ['n / e / s / d', 'Nueva HU, editar, estado Kanban, borrar'],
  ['E / i / g / p', 'Épica, importar JSON, sprints, proyectos'],
  ['espacio', 'Marcar subtarea en el detalle'],
  ['r / ? / q', 'Recargar, ayuda, salir'],
  ['', ''],
  ['Agentes', 'Siguen en el CLI: context, status, backlog import --json'],
  ['TUI', 'Solo humanos. `klarify tui` o `klarify` sin args en una TTY'],
];

export function HelpScreen({ onBack }: { onBack: () => void }) {
  useInput(() => {
    onBack();
  });

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text bold color={colors.primaryHi}>
        Atajos
      </Text>
      {LINES.map(([key, value]) =>
        key ? (
          <Text key={key}>
            <Text color={colors.primaryHi}>{key.padEnd(16)}</Text>
            <Text color={colors.ink}>{value}</Text>
          </Text>
        ) : (
          <Text key="gap"> </Text>
        )
      )}
      <Text color={colors.faint}>Cualquier tecla vuelve</Text>
    </Box>
  );
}
