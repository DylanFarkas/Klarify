import type { ReactNode } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme';

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
  renderRow: (item: T, selected: boolean, focused: boolean) => ReactNode;
  empty: string;
}) {
  const { colors } = useTheme();
  if (items.length === 0) {
    return (
      <Box paddingY={1} paddingX={1}>
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
        return (
          <Box
            key={getKey(item, index)}
            flexDirection="row"
            backgroundColor={selected && focused ? colors.surfaceHi : selected ? colors.surface : undefined}
          >
            {renderRow(item, selected, focused)}
          </Box>
        );
      })}
    </Box>
  );
}
