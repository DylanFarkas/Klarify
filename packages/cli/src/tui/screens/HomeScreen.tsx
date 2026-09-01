import { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { updateSubtask } from '../../core/services';
import type { BacklogEpic, BacklogStory, LiveBacklog } from '../../core/types';
import { Panel } from '../components/Chrome';
import { SelectList } from '../components/SelectList';
import { StoryDetail, StoryMeta } from '../components/StoryDetail';
import { colors, statusColor } from '../theme';

type Pane = 'epics' | 'stories' | 'detail';

export function HomeScreen({
  backlog,
  projectId,
  listHeight,
  active,
  onCreateStory,
  onEditStory,
  onStatus,
  onDeleteStory,
  onCreateEpic,
  onSprints,
  onImport,
  onProjects,
  onHelp,
  onReload,
  onQuit,
  onError,
}: {
  backlog: LiveBacklog;
  projectId: string;
  listHeight: number;
  active: boolean;
  onCreateStory: (epicId: string) => void;
  onEditStory: (storyId: string) => void;
  onStatus: (storyId: string) => void;
  onDeleteStory: (story: BacklogStory) => void;
  onCreateEpic: () => void;
  onSprints: () => void;
  onImport: () => void;
  onProjects: () => void;
  onHelp: () => void;
  onReload: () => void;
  onQuit: () => void;
  onError: (message: string) => void;
}) {
  const epics = backlog.epics ?? [];
  const [pane, setPane] = useState<Pane>('epics');
  const [epicIndex, setEpicIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [subtaskIndex, setSubtaskIndex] = useState(0);

  const epic: BacklogEpic | undefined = epics[Math.min(epicIndex, Math.max(0, epics.length - 1))];
  const stories = useMemo(() => epic?.stories ?? [], [epic]);
  const story = stories[Math.min(storyIndex, Math.max(0, stories.length - 1))];

  useInput((input, key) => {
    if (!active) return;
    if (input === '?') {
      onHelp();
      return;
    }
    if (input === 'q' || key.escape) {
      onQuit();
      return;
    }
    if (input === 'p') {
      onProjects();
      return;
    }
    if (input === 'i') {
      onImport();
      return;
    }
    if (input === 'g') {
      onSprints();
      return;
    }
    if (input === 'r') {
      onReload();
      return;
    }
    if (input === 'E') {
      onCreateEpic();
      return;
    }
    if (key.tab) {
      setPane((current) => (current === 'epics' ? 'stories' : current === 'stories' ? 'detail' : 'epics'));
      return;
    }
    if (input === 'n') {
      if (!epic) {
        onCreateEpic();
        return;
      }
      onCreateStory(epic.id);
      return;
    }
    if (input === 'e' && story) {
      onEditStory(story.id);
      return;
    }
    if (input === 's' && story) {
      onStatus(story.id);
      return;
    }
    if (input === 'd' && story) {
      onDeleteStory(story);
      return;
    }

    if (pane === 'epics') {
      if (key.downArrow || input === 'j') {
        setEpicIndex((value) => Math.min(epics.length - 1, value + 1));
        setStoryIndex(0);
        setSubtaskIndex(0);
      }
      if (key.upArrow || input === 'k') {
        setEpicIndex((value) => Math.max(0, value - 1));
        setStoryIndex(0);
        setSubtaskIndex(0);
      }
      if (key.return && epic) setPane('stories');
      return;
    }

    if (pane === 'stories') {
      if (key.downArrow || input === 'j') {
        setStoryIndex((value) => Math.min(stories.length - 1, value + 1));
        setSubtaskIndex(0);
      }
      if (key.upArrow || input === 'k') {
        setStoryIndex((value) => Math.max(0, value - 1));
        setSubtaskIndex(0);
      }
      if (key.return && story) setPane('detail');
      return;
    }

    const subtasks = story?.subtasks ?? [];
    if (key.downArrow || input === 'j') {
      setSubtaskIndex((value) => Math.min(Math.max(0, subtasks.length - 1), value + 1));
    }
    if (key.upArrow || input === 'k') {
      setSubtaskIndex((value) => Math.max(0, value - 1));
    }
    if ((input === ' ' || key.return) && story && subtasks[subtaskIndex]) {
      const sub = subtasks[subtaskIndex];
      void updateSubtask(projectId, story.id, sub.id, { done: !sub.done })
        .then(() => onReload())
        .catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)));
    }
  }, { isActive: active });

  const innerH = Math.max(4, listHeight - 2);

  return (
    <Box flexGrow={1} flexDirection="row" gap={0}>
      <Panel title="Épicas" focused={pane === 'epics'} width="24%">
        <SelectList
          items={epics}
          selectedIndex={Math.min(epicIndex, Math.max(0, epics.length - 1))}
          focused={pane === 'epics'}
          height={innerH}
          getKey={(item) => item.id}
          empty="Sin épicas. E nueva · i importar"
          renderRow={(item) => (
            <Text color={colors.ink} wrap="truncate">
              {item.id}  {item.title}  ({item.stories.length})
            </Text>
          )}
        />
      </Panel>
      <Panel title="Historias" focused={pane === 'stories'} width="38%">
        <SelectList
          items={stories}
          selectedIndex={Math.min(storyIndex, Math.max(0, stories.length - 1))}
          focused={pane === 'stories'}
          height={innerH}
          getKey={(item) => item.id}
          empty="Sin historias. n para crear"
          renderRow={(item) => (
            <Text wrap="truncate">
              <Text color={statusColor[item.status ?? 'todo'] ?? colors.muted}>
                {(item.status ?? 'todo').slice(0, 4)}
              </Text>
              <Text color={colors.ink}>  {item.id}  {item.title}</Text>
            </Text>
          )}
        />
      </Panel>
      <Panel title="Detalle" focused={pane === 'detail'} flexGrow={1}>
        {story ? (
          <StoryDetail story={story} subtaskIndex={subtaskIndex} focused={pane === 'detail'} />
        ) : (
          <Text color={colors.muted}>Elige una historia.</Text>
        )}
        {story && pane !== 'detail' ? (
          <Box marginTop={1}>
            <StoryMeta story={story} />
          </Box>
        ) : null}
      </Panel>
    </Box>
  );
}

export const HOME_HINTS =
  'tab panel  j/k  n HU  e editar  s estado  d borrar  E épica  i import  g sprints  p proyectos  r  ?  q';
