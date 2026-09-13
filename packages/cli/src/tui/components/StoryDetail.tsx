import { Box, Text } from 'ink';
import type { BacklogStory } from '../../core/types';
import { useTheme } from '../theme';
import { prettyPriority, statusLabel, typeLabel } from '../work';

export function StoryMeta({ story }: { story: BacklogStory }) {
  const { colors, statusColor, priorityColor } = useTheme();
  const status = story.status ?? 'todo';
  const priority = prettyPriority(story.priority);
  return (
    <Text>
      <Text color={statusColor[status] ?? colors.muted}>{statusLabel(status)}</Text>
      {priority ? (
        <Text color={priorityColor[story.priority ?? ''] ?? colors.muted}>  ·  {priority}</Text>
      ) : null}
      {story.points != null ? <Text color={colors.muted}>  ·  {story.points} SP</Text> : null}
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
  const { colors } = useTheme();
  const criteria = story.acceptanceCriteria ?? [];
  const subtasks = story.subtasks ?? [];
  const kind = typeLabel(story.type);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color={colors.accent}>{story.id}</Text>
      <Text bold color={colors.white} wrap="wrap">
        {story.title}
      </Text>
      <Box marginTop={1}>
        <Text color={colors.faint}>{kind}</Text>
        <Text color={colors.border}>  ·  </Text>
        <StoryMeta story={story} />
      </Box>

      <Box marginTop={1}>
        <Text color={colors.muted} wrap="wrap">
          {story.description || 'Sin descripción'}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={colors.faint}>CRITERIOS</Text>
        {criteria.length === 0 ? (
          <Text color={colors.faint}>Ninguno todavía</Text>
        ) : (
          criteria.map((line, index) => (
            <Box key={`${index}-${line.slice(0, 24)}`} marginTop={index === 0 ? 0 : 0}>
              <Text wrap="wrap" color={colors.ink}>
                <Text color={colors.faint}>{index + 1}.  </Text>
                {line}
              </Text>
            </Box>
          ))
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={colors.faint}>SUBTAREAS</Text>
        {subtasks.length === 0 ? (
          <Text color={colors.faint}>Ninguna todavía</Text>
        ) : (
          subtasks.map((sub, index) => {
            const selected = focused && index === subtaskIndex;
            const mark = sub.done ? '✓' : selected ? '●' : '○';
            const markColor = sub.done ? colors.success : selected ? colors.accent : colors.faint;
            return (
              <Box
                key={sub.id}
                backgroundColor={selected ? colors.surfaceHi : undefined}
                paddingX={selected ? 0 : 0}
              >
                <Text wrap="truncate">
                  <Text color={markColor}>{mark}</Text>
                  <Text color={sub.done ? colors.faint : selected ? colors.white : colors.ink}>
                    {'  '}
                    {sub.title}
                  </Text>
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
