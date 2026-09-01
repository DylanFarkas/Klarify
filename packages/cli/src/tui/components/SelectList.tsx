import type { ReactNode } from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme';

export function SelectList<T>({
  items,
  selectedIndex,
  focused,
  height,
  getKey,
  renderRow,
  empty,
}: {
  items: T[];
  selectedIndex: number;
  focused: boolean;
  height: number;
  getKey: (item: T, index: number) => string;
  renderRow: (item: T, selected: boolean) => ReactNode;
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <Box paddingY={1}>
        <Text color={colors.muted}>{empty}</Text>
      </Box>
    );
  }

  const maxH = Math.max(1, height);
  const start = selectedIndex >= maxH ? selectedIndex - maxH + 1 : 0;
  const visible = items.slice(start, start + maxH);

  return (
    <Box flexDirection="column">
      {visible.map((item, offset) => {
        const index = start + offset;
        const selected = index === selectedIndex;
        const bg = selected && focused ? colors.primary : undefined;
        const fg = selected && focused ? colors.ink : colors.ink;
        return (
          <Box key={getKey(item, index)} flexDirection="row" backgroundColor={bg}>
            <Text color={selected && focused ? colors.ink : fg} wrap="truncate">
              {selected ? '> ' : '  '}
            </Text>
            {renderRow(item, selected)}
          </Box>
        );
      })}
    </Box>
  );
}
