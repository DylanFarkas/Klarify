import type { ReactNode } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { landingInner, packHintRows, viewport } from '../layout';
import { PIPELINE_STAGES, stageIndex } from '../pipeline';
import { BrandLockup } from './Wordmark';
import { useTheme } from '../theme';

export function Hairline({ width }: { width: number }) {
  const { colors } = useTheme();
  const n = Math.max(0, Math.floor(width));
  if (n <= 0) return null;
  return (
    <Box width={n} overflow="hidden">
      <Text color={colors.border}>{'─'.repeat(n)}</Text>
    </Box>
  );
}

export function Hints({
  items,
  width,
}: {
  items: Array<readonly [string, string]>;
  width?: number;
}) {
  const { colors } = useTheme();
  const { columns } = useWindowSize();
  const maxWidth = width && width > 0 ? width : landingInner(columns);
  const rows = packHintRows(items, maxWidth);
  return (
    <Box flexDirection="column" width={maxWidth} overflow="hidden">
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex} overflow="hidden">
          {row.map(([key, label], index) => (
            <Text key={`${key}-${label}`}>
              {index > 0 ? <Text color={colors.border}>    </Text> : null}
              <Text bold color={colors.white}>
                {key}
              </Text>
              <Text color={colors.muted}>  {label}</Text>
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function Tip({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Box>
      <Text color={colors.faint}>{children}</Text>
    </Box>
  );
}

export function PipelineDots({ filled, total = 5 }: { filled: number; total?: number }) {
  const { colors } = useTheme();
  const count = Math.min(total, Math.max(0, filled));
  return (
    <Text>
      {Array.from({ length: total }, (_, index) => (
        <Text key={index} color={index < count ? colors.white : colors.faint}>
          {index > 0 ? ' ' : ''}
          {index < count ? '●' : '○'}
        </Text>
      ))}
    </Text>
  );
}

export function PipelinePath({
  step,
  mode = 'full',
}: {
  step: number | null;
  mode?: 'full' | 'short' | 'current';
}) {
  const { colors } = useTheme();
  const current = stageIndex(step);
  if (mode === 'current') {
    const active = current >= 0 ? PIPELINE_STAGES[current] : null;
    return (
      <Text color={colors.accent} bold wrap="truncate">
        {active ? `●  ${active.label}` : 'pipeline'}
      </Text>
    );
  }
  return (
    <Box overflow="hidden">
      {PIPELINE_STAGES.map((stage, index) => {
        const isCurrent = index === current;
        const isDone = current >= 0 && index < current;
        const color = isCurrent ? colors.accent : isDone ? colors.white : colors.faint;
        const mark = isCurrent || isDone ? '●' : '○';
        const label = mode === 'short' ? stage.short : stage.label;
        return (
          <Text key={stage.step}>
            {index > 0 ? <Text color={colors.border}>{mode === 'short' ? ' · ' : '  ·  '}</Text> : null}
            <Text color={color} bold={isCurrent}>
              {mark} {label}
            </Text>
          </Text>
        );
      })}
    </Box>
  );
}

export function Landing({
  columns,
  rows,
  title,
  meta,
  aside,
  error,
  children,
  hints,
  tip,
  stage = null,
  showPath,
}: {
  columns: number;
  rows: number;
  title?: string;
  meta?: string;
  aside?: string;
  error?: string | null;
  children: ReactNode;
  hints?: ReactNode;
  tip?: ReactNode;
  stage?: number | null;
  showPath?: boolean;
}) {
  const { colors } = useTheme();
  const { gutter, inner, short, compact } = viewport(columns, rows);
  const stackHeader = inner < 42;
  const showTagline = !short && inner >= 40;
  const pathMode: 'full' | 'short' | 'current' | null =
    showPath === false || short || inner < 28
      ? null
      : inner >= 80
        ? 'full'
        : inner >= 52
          ? 'short'
          : 'current';
  const padY = short ? 0 : compact ? 1 : 2;
  const gap = short ? 0 : compact ? 1 : 2;

  return (
    <Box
      width={columns}
      height={rows}
      flexDirection="column"
      backgroundColor={colors.bg}
      paddingX={gutter}
      paddingY={padY}
      overflow="hidden"
    >
      <Box
        width={inner}
        flexDirection={stackHeader ? 'column' : 'row'}
        justifyContent="space-between"
        alignItems="flex-start"
        flexShrink={0}
        overflow="hidden"
      >
        <BrandLockup tagline={showTagline} />
        {aside ? (
          <Box marginTop={stackHeader ? 1 : 0} overflow="hidden">
            <Text color={colors.muted} wrap="truncate">
              {aside}
            </Text>
          </Box>
        ) : null}
      </Box>

      {gap > 0 ? <Box height={gap} flexShrink={0} /> : null}

      {title ? (
        <Box width={inner} flexShrink={0} flexDirection="column" overflow="hidden">
          <Text bold color={colors.white} wrap="truncate">
            {title}
          </Text>
          {meta && !short ? (
            <Box marginTop={compact ? 0 : 1} overflow="hidden">
              <Text color={colors.muted} wrap="truncate">
                {meta}
              </Text>
            </Box>
          ) : null}
        </Box>
      ) : null}

      {error ? (
        <Box width={inner} marginTop={1} flexShrink={0} overflow="hidden">
          <Text color={colors.danger} wrap="truncate">
            {error}
          </Text>
        </Box>
      ) : null}

      {pathMode ? (
        <Box width={inner} marginTop={compact ? 1 : 2} flexShrink={0} overflow="hidden">
          <PipelinePath step={stage} mode={pathMode} />
        </Box>
      ) : null}

      {gap > 0 ? <Box height={gap} flexShrink={0} /> : null}

      <Box flexGrow={1} width={inner} flexDirection="column" overflow="hidden">
        {children}
      </Box>

      {hints || tip ? (
        <Box width={inner} flexShrink={0} flexDirection="column" marginTop={compact || short ? 1 : 2} overflow="hidden">
          {hints}
          {tip && !short ? <Box marginTop={1}>{tip}</Box> : null}
        </Box>
      ) : null}
    </Box>
  );
}
