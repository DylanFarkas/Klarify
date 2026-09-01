import type { ReactNode } from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme';

export function Header({
  project,
  user,
  error,
}: {
  project: string;
  user: string;
  error?: string | null;
}) {
  return (
    <Box flexDirection="column">
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color={colors.primaryHi}>
          KLARIFY
        </Text>
        <Text color={colors.ink}>{project}</Text>
        <Text color={colors.muted}>{user}</Text>
      </Box>
      {error ? (
        <Box paddingX={1}>
          <Text color={colors.danger}>{error}</Text>
        </Box>
      ) : null}
    </Box>
  );
}

export function Footer({ hints }: { hints: string }) {
  return (
    <Box paddingX={1}>
      <Text color={colors.faint}>{hints}</Text>
    </Box>
  );
}

export function Panel({
  title,
  focused,
  children,
  width,
  flexGrow,
}: {
  title: string;
  focused: boolean;
  children: ReactNode;
  width?: number | string;
  flexGrow?: number;
}) {
  return (
    <Box
      flexDirection="column"
      width={width}
      flexGrow={flexGrow}
      borderStyle="round"
      borderColor={focused ? colors.primary : colors.border}
      paddingX={1}
      overflow="hidden"
    >
      <Text bold color={focused ? colors.primaryHi : colors.muted}>
        {title}
      </Text>
      {children}
    </Box>
  );
}
