import { Box, Text } from 'ink';
import type { BacklogStory } from '../../core/types';
import { KANBAN_LABELS } from '../../core/types';
import { colors, priorityColor, statusColor } from '../theme';

export function StoryMeta({ story }: { story: BacklogStory }) {
  const status = story.status ?? 'todo';
  const priority = story.priority ?? '';
  return (
    <Text>
      <Text color={statusColor[status] ?? colors.muted}>{KANBAN_LABELS[status] ?? status}</Text>
      {priority ? (
        <Text color={priorityColor[priority] ?? colors.muted}> · {priority}</Text>
      ) : null}
      {story.points != null ? <Text color={colors.muted}> · {story.points} pts</Text> : null}
    </Text>
  );
}

export function StoryDetail({
  story,
  subtaskIndex,
  focused,
}: {
  story: BacklogStory;
  subtaskIndex: number;
  focused: boolean;
}) {
  const subtasks = story.subtasks ?? [];
  return (
    <Box flexDirection="column">
      <Text bold color={colors.ink} wrap="truncate">
        {story.id}  {story.title}
      </Text>
      <StoryMeta story={story} />
      <Text color={colors.faint}>{story.epicId}</Text>
      <Text color={colors.muted} wrap="wrap">
        {story.description || 'Sin descripción'}
      </Text>
      <Text bold color={colors.muted}>
        Criterios
      </Text>
      {(story.acceptanceCriteria ?? []).length === 0 ? (
        <Text color={colors.faint}>Ninguno</Text>
      ) : (
        story.acceptanceCriteria.map((line, index) => (
          <Text key={`${index}-${line.slice(0, 24)}`} wrap="wrap" color={colors.ink}>
            {index + 1}. {line}
          </Text>
        ))
      )}
      <Text bold color={colors.muted}>
        Subtareas  {focused ? '(espacio marca)' : ''}
      </Text>
      {subtasks.length === 0 ? (
        <Text color={colors.faint}>Ninguna</Text>
      ) : (
        subtasks.map((sub, index) => {
          const selected = focused && index === subtaskIndex;
          return (
            <Text
              key={sub.id}
              color={selected ? colors.ink : colors.muted}
              backgroundColor={selected ? colors.primary : undefined}
            >
              {sub.done ? '[x]' : '[ ]'} {sub.id} {sub.title}
            </Text>
          );
        })
      )}
    </Box>
  );
}
