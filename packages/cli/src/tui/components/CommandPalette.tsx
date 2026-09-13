import { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Hairline, Hints, Landing } from './Landing';
import { clampWidth, landingInner, pageGutter } from '../layout';
import { useTheme } from '../theme';
import { filterPaletteCommands, isCtrlP, type PaletteCommand, type PaletteCommandId } from '../palette';

const HINTS = [
  ['↑↓', 'mover'],
  ['enter', 'ejecutar'],
  ['esc', 'cerrar'],
] as const;

export function CommandPalette({
  columns,
  rows,
  commands,
  showBrand,
  onRun,
  onClose,
}: {
  columns: number;
  rows: number;
  commands: PaletteCommand[];
  showBrand: boolean;
  onRun: (id: PaletteCommandId) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const pad = pageGutter(columns);
  const width = clampWidth(64, columns);
  const filtered = useMemo(() => filterPaletteCommands(commands, query), [commands, query]);
  const selected = Math.min(index, Math.max(0, filtered.length - 1));
  const listHeight = Math.min(12, Math.max(3, rows - (showBrand ? (rows < 18 ? 10 : 16) : 8)));

  useInput((input, key) => {
    if (key.eventType === 'release') return;
    if (key.escape) {
      if (query) {
        setQuery('');
        setIndex(0);
        return;
      }
      onClose();
      return;
    }
    if (isCtrlP(input, key)) {
      onClose();
      return;
    }
    if (key.downArrow) {
      setIndex((value) => Math.min(Math.max(0, filtered.length - 1), value + 1));
      return;
    }
    if (key.upArrow) {
      setIndex((value) => Math.max(0, value - 1));
      return;
    }
    if (key.return) {
      const command = filtered[selected];
      if (command?.enabled) onRun(command.id);
      return;
    }
    if (key.backspace || key.delete) {
      setQuery((value) => value.slice(0, -1));
      setIndex(0);
      return;
    }
    if (key.ctrl || key.meta || key.tab) return;
    if (input) {
      setQuery((value) => value + input.replace(/\r?\n/g, ''));
      setIndex(0);
    }
  });

  const start = selected >= listHeight ? selected - listHeight + 1 : 0;
  const visible = filtered.slice(start, start + listHeight);
  const list = (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={colors.faint}>buscar  </Text>
        <Text color={query ? colors.white : colors.faint}>{query || 'nombre o atajo'}</Text>
        <Text color={colors.accent}>▌</Text>
      </Box>
      <Hairline width={showBrand ? landingInner(columns) : width} />
      <Box marginTop={1} flexDirection="column">
        {visible.length === 0 ? (
          <Box paddingY={1}>
            <Text color={colors.muted}>{query ? `Nada coincide con “${query}”.` : 'No hay comandos.'}</Text>
          </Box>
        ) : (
          visible.map((command) => {
            const isSelected = command.id === filtered[selected]?.id;
            const color = !command.enabled
              ? colors.faint
              : isSelected
                ? colors.white
                : colors.ink;
            return (
              <Box
                key={command.id}
                width={showBrand ? landingInner(columns) : width}
                justifyContent="space-between"
                backgroundColor={isSelected ? colors.surfaceHi : undefined}
              >
                <Box>
                  <Text color={isSelected && command.enabled ? colors.accent : colors.faint}>
                    {isSelected ? '●' : ' '}
                  </Text>
                  <Text color={color} bold={isSelected && command.enabled}>
                    {'  '}
                    {command.label}
                    {!command.enabled ? '  ·  ahora no' : ''}
                  </Text>
                </Box>
                <Text color={isSelected && command.enabled ? colors.accent : colors.faint}>
                  {command.shortcut}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );

  if (showBrand) {
    return (
      <Landing
        columns={columns}
        rows={rows}
        title="Comandos"
        meta="Escribe para filtrar. Enter ejecuta el seleccionado."
        showPath={false}
        hints={<Hints items={[...HINTS]} />}
      >
        {list}
      </Landing>
    );
  }

  return (
    <Box
      width={columns}
      flexGrow={1}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor={colors.bg}
      paddingX={pad}
    >
      <Box width={width} flexDirection="column">
        <Text bold color={colors.white}>
          Comandos
        </Text>
        <Box marginTop={1}>
          <Text color={colors.muted}>Escribe para filtrar. Enter ejecuta el seleccionado.</Text>
        </Box>
        <Box marginTop={1} marginBottom={1}>
          <Hairline width={width} />
        </Box>
        {list}
        <Box marginTop={2}>
          <Hints items={[...HINTS]} />
        </Box>
      </Box>
    </Box>
  );
}
