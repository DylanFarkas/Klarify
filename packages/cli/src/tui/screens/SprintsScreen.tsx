import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { completeSprint, createSprint, deleteSprint, startSprint } from '../../core/services';
import type { BacklogSprint, SprintRollover } from '../../core/types';
import { SelectList } from '../components/SelectList';
import { useTheme } from '../theme';

export function SprintsScreen({
  projectId,
  sprints,
  listHeight,
  onBack,
  onReload,
  onError,
  onAskConfirm,
}: {
  projectId: string;
  sprints: BacklogSprint[];
  listHeight: number;
  onBack: () => void;
  onReload: () => void;
  onError: (message: string) => void;
  onAskConfirm: (title: string, detail: string, action: () => Promise<void>) => void;
}) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [creating, setCreating] = useState(false);

  useInput((input, key) => {
    if (creating) return;
    if (key.ctrl) return;
    if (key.escape || input === 'q' || input === 'b') {
      onBack();
      return;
    }
    if (input === 'n') {
      setCreating(true);
      return;
    }
    if (key.downArrow || input === 'j') setIndex((value) => Math.min(sprints.length - 1, value + 1));
    if (key.upArrow || input === 'k') setIndex((value) => Math.max(0, value - 1));
    const sprint = sprints[index];
    if (!sprint) return;
    if (input === 'a') {
      void startSprint(projectId, sprint.id)
        .then(() => onReload())
        .catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)));
    }
    if (input === 'c') {
      onAskConfirm(`Completar ${sprint.id}`, 'Las historias abiertas pasan al backlog.', async () => {
        await completeSprint(projectId, sprint.id, 'backlog' satisfies SprintRollover);
        onReload();
      });
    }
    if (input === 'd') {
      onAskConfirm(`Eliminar ${sprint.id}`, 'Solo sprints vacíos.', async () => {
        await deleteSprint(projectId, sprint.id, true);
        onReload();
      });
    }
  }, { isActive: !creating });

  if (creating) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color={colors.primaryHi}>
          Nuevo sprint
        </Text>
        <TextInput
          placeholder="Objetivo (opcional)"
          onSubmit={(goal) => {
            void createSprint(projectId, goal.trim() || undefined)
              .then(() => {
                setCreating(false);
                onReload();
              })
              .catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)));
          }}
        />
        <Text color={colors.faint}>enter crear</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} gap={1} flexGrow={1}>
      <Text bold color={colors.primaryHi}>
        Sprints
      </Text>
      <SelectList
        items={sprints}
        selectedIndex={index}
        focused
        height={listHeight}
        getKey={(item) => item.id}
        empty="Sin sprints. n para crear."
        renderRow={(item) => (
          <Text>
            <Text color={item.status === 'active' ? colors.success : colors.muted}>{item.status}</Text>
            <Text color={colors.ink}>
              {'  '}
              {item.id}  {item.goal || '(sin objetivo)'}
            </Text>
          </Text>
        )}
      />
      <Text color={colors.faint}>n nuevo · a iniciar · c completar · d borrar · esc volver</Text>
    </Box>
  );
}
