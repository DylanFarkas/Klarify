import type { ReactNode } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { Hairline, Hints } from './Landing';
import { BrandLockup } from './Wordmark';
import { landingInner, pageGutter, viewport } from '../layout';
import { useTheme } from '../theme';

export function Header({
  project,
  meta,
  user,
  error,
  refreshing,
  columns = 80,
}: {
  project: string;
  meta?: string;
  user: string;
  error?: string | null;
  refreshing?: boolean;
  columns?: number;
}) {
  const { colors } = useTheme();
  const { rows } = useWindowSize();
  const { gutter, inner, short } = viewport(columns, rows);
  const stacked = inner < 48;
  const subtitle = refreshing ? (meta ? `${meta}  ·  sync` : 'sync') : meta;
  return (
    <Box flexDirection="column" backgroundColor={colors.bg} paddingX={gutter} paddingTop={short ? 0 : 1} flexShrink={0}>
      <Box
        width={inner}
        flexDirection={stacked ? 'column' : 'row'}
        justifyContent="space-between"
        alignItems="flex-start"
        overflow="hidden"
      >
        <BrandLockup />
        <Box
          flexDirection="column"
          alignItems={stacked ? 'flex-start' : 'flex-end'}
          marginTop={stacked ? 1 : 0}
          overflow="hidden"
          width={stacked ? inner : undefined}
        >
          <Text bold color={colors.white} wrap="truncate">
            {project}
          </Text>
          {subtitle ? (
            <Text color={colors.muted} wrap="truncate">
              {subtitle}
            </Text>
          ) : user ? (
            <Text color={colors.muted} wrap="truncate">
              {user}
            </Text>
          ) : null}
        </Box>
      </Box>
      {error ? (
        <Box marginTop={1} width={inner} overflow="hidden">
          <Text color={colors.danger} wrap="truncate">
            {error}
          </Text>
        </Box>
      ) : null}
      <Box marginTop={1} width={inner} overflow="hidden">
        <Hairline width={inner} />
      </Box>
    </Box>
  );
}

export function Footer({
  hints,
  items,
  columns = 80,
}: {
  hints?: string;
  items?: Array<readonly [string, string]>;
  columns?: number;
}) {
  const { colors } = useTheme();
  const pad = pageGutter(columns);
  const inner = landingInner(columns);
  return (
    <Box flexDirection="column" backgroundColor={colors.bg} paddingX={pad} paddingBottom={1} flexShrink={0}>
      <Hairline width={inner} />
      <Box marginTop={1} width={inner} overflow="hidden">
        {items ? <Hints items={items} width={inner} /> : <Text color={colors.muted}>{hints}</Text>}
      </Box>
    </Box>
  );
}

export function Panel({
  title,
  count,
  focused,
  children,
  width,
  flexGrow,
  rule,
}: {
  title: string;
  count?: string;
  focused: boolean;
  children: ReactNode;
  width?: number | string;
  flexGrow?: number;
  rule?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Box
      flexDirection="column"
      width={width}
      flexGrow={flexGrow}
      paddingX={1}
      overflow="hidden"
      backgroundColor={focused ? colors.surface : colors.bg}
      {...(rule
        ? {
            borderStyle: 'single' as const,
            borderColor: colors.border,
            borderTop: false,
            borderBottom: false,
            borderLeft: false,
            borderRight: true,
          }
        : {})}
    >
      <Box justifyContent="space-between" flexShrink={0} marginBottom={1}>
        <Text bold color={focused ? colors.white : colors.muted}>
          <Text color={focused ? colors.accent : colors.faint}>{focused ? '●' : '○'}</Text>
          {'  '}
          {title}
        </Text>
        {count ? <Text color={colors.faint}>{count}</Text> : null}
      </Box>
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        {children}
      </Box>
    </Box>
  );
}
