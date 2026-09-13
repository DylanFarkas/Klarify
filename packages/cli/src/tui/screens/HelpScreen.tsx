import { Box, Text, useInput, useWindowSize } from 'ink';
import { viewport } from '../layout';
import { useTheme } from '../theme';

const LINES = [
  ['tab / shift+tab', 'Cambiar de panel'],
  ['j k  /  enter', 'Moverse y entrar (épica → historias → detalle)'],
  ['esc', 'Volver al panel anterior. En épicas, a proyectos'],
  ['n / E', 'Nueva historia / nueva épica'],
  ['e / s / d', 'Editar, cambiar estado, borrar la historia'],
  ['espacio', 'Marcar o desmarcar subtarea (en detalle)'],
  ['i / g / p', 'Importar JSON, sprints, proyectos'],
  ['r / ?', 'Recargar, esta ayuda'],
  ['ctrl+p', 'Paleta de comandos'],
  ['t', 'Cambiar tema'],
  ['q', 'Volver a proyectos'],
  ['ctrl+c', 'Salir de la TUI'],
  ['', ''],
  ['Agentes', 'Siguen en el CLI: context, status, backlog import --json'],
  ['TUI', 'Solo humanos. `klarify tui` o `klarify` sin args en una TTY'],
];

export function HelpScreen({ onBack, active = true }: { onBack: () => void; active?: boolean }) {
  useInput((input, key) => {
    if (key.ctrl && (input === 'p' || input === 'P')) return;
    onBack();
  }, { isActive: active });

  const { colors } = useTheme();
  const { columns, rows } = useWindowSize();
  const { gutter, inner, stacked } = viewport(columns, rows);
  const visible = LINES.filter(([key]) => key).slice(0, Math.max(6, rows - 6));

  return (
    <Box flexDirection="column" paddingX={gutter} paddingY={1} overflow="hidden" width={columns} height={rows}>
      <Text bold color={colors.white}>
        Atajos
      </Text>
      <Box marginBottom={1} width={inner} overflow="hidden">
        <Text color={colors.muted} wrap="truncate">
          El pie de cada panel muestra solo lo que aplica ahora.
        </Text>
      </Box>
      {visible.map(([key, value]) =>
        stacked ? (
          <Box key={key} flexDirection="column" width={inner} marginBottom={1} overflow="hidden">
            <Text color={colors.accent}>{key}</Text>
            <Text color={colors.ink} wrap="wrap">
              {value}
            </Text>
          </Box>
        ) : (
          <Box key={key} width={inner} overflow="hidden">
            <Box width={Math.min(18, Math.floor(inner * 0.32))} flexShrink={0}>
              <Text color={colors.accent}>{key}</Text>
            </Box>
            <Box flexGrow={1} overflow="hidden">
              <Text color={colors.ink} wrap="wrap">
                {value}
              </Text>
            </Box>
          </Box>
        ),
      )}
      <Box marginTop={1}>
        <Text color={colors.faint}>Cualquier tecla vuelve</Text>
      </Box>
    </Box>
  );
}
