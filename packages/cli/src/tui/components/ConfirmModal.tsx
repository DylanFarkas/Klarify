import { Box, Text } from 'ink';
import { ConfirmInput } from '@inkjs/ui';
import { colors } from '../theme';

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
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.danger}
      paddingX={2}
      paddingY={1}
      width={56}
    >
      <Text bold color={colors.danger}>
        {title}
      </Text>
      {detail ? <Text color={colors.muted}>{detail}</Text> : null}
      <Box marginTop={1} gap={1}>
        <Text color={colors.ink}>Confirmar</Text>
        <ConfirmInput
          defaultChoice="cancel"
          submitOnEnter
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </Box>
      <Text color={colors.faint}>y sí · n no · enter según el default (n)</Text>
    </Box>
  );
}
