import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { setStatus } from '../../core/services';
import { KANBAN_LABELS, KANBAN_STATUSES, type KanbanStatus } from '../../core/types';
import { useTheme } from '../theme';

export function StatusScreen({
  projectId,
  storyId,
  current,
  onDone,
  onCancel,
  onError,
}: {
  projectId: string;
  storyId: string;
  current: KanbanStatus | null;
  onDone: (status: KanbanStatus) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const { colors, statusColor } = useTheme();
  const initial = Math.max(0, KANBAN_STATUSES.indexOf(current ?? 'todo'));
  const [index, setIndex] = useState(initial);

  useInput((input, key) => {
    if (key.ctrl) return;
    if (key.escape || input === 'q') {
      onCancel();
      return;
    }
    if (key.downArrow || input === 'j') setIndex((value) => Math.min(KANBAN_STATUSES.length - 1, value + 1));
    if (key.upArrow || input === 'k') setIndex((value) => Math.max(0, value - 1));
    if (key.return) {
      const status = KANBAN_STATUSES[index]!;
      void setStatus(projectId, storyId, status)
        .then(() => onDone(status))
        .catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)));
    }
  });

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text bold color={colors.primaryHi}>
        Estado de {storyId}
      </Text>
      {KANBAN_STATUSES.map((status, i) => (
        <Text key={status} color={i === index ? colors.onAccent : colors.muted} backgroundColor={i === index ? colors.accent : undefined}>
          {i === index ? '> ' : '  '}
          <Text color={statusColor[status]}>{KANBAN_LABELS[status]}</Text>
          {status === current ? <Text color={colors.faint}>  (actual)</Text> : null}
        </Text>
      ))}
      <Text color={colors.faint}>j/k · enter aplica · esc cancela</Text>
    </Box>
  );
}
