import { Box, Text, useWindowSize } from 'ink';
import { ConfirmInput } from '@inkjs/ui';
import { clampWidth } from '../layout';
import { useTheme } from '../theme';

export function ConfirmModal({
  title,
  detail,
  onConfirm,
  onCancel,
}: {
  title: string;
  detail?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const { columns } = useWindowSize();
  const width = clampWidth(56, columns);
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.danger}
      paddingX={2}
      paddingY={1}
      width={width}
      overflow="hidden"
    >
      <Text bold color={colors.danger} wrap="truncate">
        {title}
      </Text>
      {detail ? (
        <Text color={colors.muted} wrap="wrap">
          {detail}
        </Text>
      ) : null}
      <Box marginTop={1} gap={1}>
        <Text color={colors.ink}>Confirmar</Text>
        <ConfirmInput
          defaultChoice="cancel"
          submitOnEnter
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </Box>
      <Text color={colors.faint} wrap="truncate">
        y sí · n no · enter según el default (n)
      </Text>
    </Box>
  );
}
