import { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import type { BacklogEpic, BacklogStory, LiveBacklog } from '../../core/types';
import { Panel } from '../components/Chrome';
import { Hints } from '../components/Landing';
import { SelectList } from '../components/SelectList';
import { StoryDetail } from '../components/StoryDetail';
import { pageGutter, viewport } from '../layout';
import { useTheme } from '../theme';

type Pane = 'epics' | 'stories' | 'detail';

const PANE_ORDER: Pane[] = ['epics', 'stories', 'detail'];

export type WorkCursor = {
  pane: Pane;
  epicId: string | null;
  storyId: string | null;
};

export const EMPTY_WORK_CURSOR: WorkCursor = { pane: 'epics', epicId: null, storyId: null };

function indexById<T extends { id: string }>(items: T[], id: string | null): number {
  if (!id) return 0;
  const index = items.findIndex((item) => item.id === id);
  return index >= 0 ? index : 0;
}

export function HomeScreen({
  backlog,
  listHeight,
  columns,
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
  onToggleSubtask,
  cursor,
  onCursorChange,
  onTheme,
}: {
  backlog: LiveBacklog;
  listHeight: number;
  columns: number;
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
  onToggleSubtask: (storyId: string, subtaskId: string, done: boolean) => void;
  cursor: WorkCursor;
  onCursorChange: (cursor: WorkCursor) => void;
  onTheme: () => void;
}) {
  const { colors, statusColor } = useTheme();
  const { rows } = useWindowSize();
  const view = viewport(columns, rows);
  const stacked = view.stacked;
  const inner = view.inner;
  const epics = backlog.epics ?? [];
  const [pane, setPane] = useState<Pane>(cursor.pane);
  const [epicId, setEpicId] = useState<string | null>(cursor.epicId);
  const [storyId, setStoryId] = useState<string | null>(cursor.storyId);
  const [subtaskIndex, setSubtaskIndex] = useState(0);

  const epicIndex = indexById(epics, epicId);
  const epic: BacklogEpic | undefined = epics[epicIndex];
  const stories = useMemo(() => epic?.stories ?? [], [epic]);
  const storyIndex = indexById(stories, storyId);
  const story = stories[storyIndex];
  const pad = pageGutter(columns);

  useEffect(() => {
    onCursorChange({
      pane,
      epicId: epic?.id ?? epicId,
      storyId: story?.id ?? storyId,
    });
  }, [pane, epic?.id, story?.id, epicId, storyId, onCursorChange]);

  useInput((input, key) => {
    if (!active) return;
    if (key.ctrl) return;
    if (input === 't') {
      onTheme();
      return;
    }
    if (input === '?') {
      onHelp();
      return;
    }
    if (input === 'q') {
      onQuit();
      return;
    }
    if (key.escape) {
      if (pane === 'detail') {
        setPane('stories');
        return;
      }
      if (pane === 'stories') {
        setPane('epics');
        return;
      }
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
      setPane((current) => {
        const index = PANE_ORDER.indexOf(current);
        const next = key.shift ? index - 1 : index + 1;
        return PANE_ORDER[(next + PANE_ORDER.length) % PANE_ORDER.length]!;
      });
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
        const next = epics[Math.min(epics.length - 1, epicIndex + 1)];
        if (next) {
          setEpicId(next.id);
          setStoryId(next.stories[0]?.id ?? null);
          setSubtaskIndex(0);
        }
      }
      if (key.upArrow || input === 'k') {
        const next = epics[Math.max(0, epicIndex - 1)];
        if (next) {
          setEpicId(next.id);
          setStoryId(next.stories[0]?.id ?? null);
          setSubtaskIndex(0);
        }
      }
      if (key.return && epic) setPane('stories');
      return;
    }

    if (pane === 'stories') {
      if (key.downArrow || input === 'j') {
        const next = stories[Math.min(stories.length - 1, storyIndex + 1)];
        if (next) {
          setStoryId(next.id);
          setSubtaskIndex(0);
        }
      }
      if (key.upArrow || input === 'k') {
        const next = stories[Math.max(0, storyIndex - 1)];
        if (next) {
          setStoryId(next.id);
          setSubtaskIndex(0);
        }
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
      onToggleSubtask(story.id, sub.id, !sub.done);
    }
  }, { isActive: active });

  const innerH = stacked
    ? Math.max(4, rows - (view.short ? 8 : 11))
    : Math.max(4, listHeight - 5);
  const hints = hintsFor(pane, Boolean(epic), Boolean(story), stacked || view.short);

  const epicsPanel = (
    <Panel
      title="Épicas"
      count={String(epics.length)}
      focused={pane === 'epics'}
      width={stacked ? undefined : '34%'}
      flexGrow={stacked ? 1 : undefined}
      rule={!stacked}
    >
      <SelectList
        items={epics}
        selectedIndex={Math.min(epicIndex, Math.max(0, epics.length - 1))}
        focused={pane === 'epics'}
        height={innerH}
        getKey={(item) => item.id}
        empty="No hay épicas. Pulsa E para crear o i para importar."
        renderRow={(item, selected, focused) => (
          <Box flexGrow={1} overflow="hidden">
            <Box flexGrow={1} flexShrink={1} overflow="hidden">
              <Text
                bold={selected}
                color={selected && focused ? colors.white : colors.ink}
                wrap="truncate"
              >
                {item.title}
              </Text>
            </Box>
            <Box flexShrink={0}>
              <Text color={colors.faint}> {item.stories.length}</Text>
            </Box>
          </Box>
        )}
      />
    </Panel>
  );

  const storiesPanel = (
    <Panel
      title="Historias"
      count={String(stories.length)}
      focused={pane === 'stories'}
      width={stacked ? undefined : '32%'}
      flexGrow={stacked ? 1 : undefined}
      rule={!stacked}
    >
      <SelectList
        items={stories}
        selectedIndex={Math.min(storyIndex, Math.max(0, stories.length - 1))}
        focused={pane === 'stories'}
        height={innerH}
        getKey={(item) => item.id}
        empty="Esta épica no tiene historias. Pulsa n para crear una."
        renderRow={(item, selected, focused) => (
          <Box flexGrow={1} overflow="hidden">
            {columns >= 72 ? (
              <Box flexShrink={0}>
                <Text color={statusColor[item.status ?? 'todo'] ?? colors.muted}>●</Text>
                <Text color={colors.faint}> {item.id}  </Text>
              </Box>
            ) : (
              <Box flexShrink={0}>
                <Text color={statusColor[item.status ?? 'todo'] ?? colors.muted}>● </Text>
              </Box>
            )}
            <Box flexGrow={1} flexShrink={1} overflow="hidden">
              <Text
                bold={selected}
                color={selected && focused ? colors.white : colors.ink}
                wrap="truncate"
              >
                {item.title}
              </Text>
            </Box>
          </Box>
        )}
      />
    </Panel>
  );

  const detailPanel = (
    <Panel title="Detalle" focused={pane === 'detail'} flexGrow={1}>
      {story ? (
        <StoryDetail story={story} subtaskIndex={subtaskIndex} focused={pane === 'detail'} />
      ) : (
        <Box paddingX={1} paddingY={1}>
          <Text color={colors.muted}>Elige una historia para ver el detalle.</Text>
        </Box>
      )}
    </Panel>
  );

  const activePanel = pane === 'epics' ? epicsPanel : pane === 'stories' ? storiesPanel : detailPanel;

  return (
    <Box flexGrow={1} flexDirection="column" overflow="hidden">
      <Box paddingX={pad} paddingY={view.short ? 0 : 1} flexShrink={0} overflow="hidden" width={columns}>
        <Breadcrumb pane={pane} epic={epic} story={story} width={inner} />
      </Box>
      <Box
        flexGrow={1}
        flexDirection={stacked ? 'column' : 'row'}
        overflow="hidden"
        paddingX={Math.max(0, pad - 1)}
      >
        {stacked ? activePanel : (
          <>
            {epicsPanel}
            {storiesPanel}
            {detailPanel}
          </>
        )}
      </Box>
      <Box paddingX={pad} paddingY={view.short ? 0 : 1} flexShrink={0} overflow="hidden">
        <Hints items={hints} width={inner} />
      </Box>
    </Box>
  );
}

function Breadcrumb({
  pane,
  epic,
  story,
  width,
}: {
  pane: Pane;
  epic: BacklogEpic | undefined;
  story: BacklogStory | undefined;
  width: number;
}) {
  const { colors } = useTheme();
  return (
    <Box width={width} overflow="hidden">
      <Text wrap="truncate">
        <Text color={pane === 'epics' ? colors.white : colors.faint} bold={pane === 'epics'}>
          Épicas
        </Text>
        {epic ? (
          <>
            <Text color={colors.border}>  ›  </Text>
            <Text color={pane === 'stories' ? colors.white : colors.faint} bold={pane === 'stories'}>
              {epic.title}
            </Text>
          </>
        ) : null}
        {story && pane === 'detail' ? (
          <>
            <Text color={colors.border}>  ›  </Text>
            <Text color={colors.white} bold>
              {story.title}
            </Text>
          </>
        ) : null}
      </Text>
    </Box>
  );
}

function hintsFor(
  pane: Pane,
  hasEpic: boolean,
  hasStory: boolean,
  compact: boolean,
): Array<readonly [string, string]> {
  if (pane === 'epics') {
    if (compact) {
      return [
        ['j/k', 'mover'],
        ['enter', 'historias'],
        ['n', hasEpic ? 'nueva' : 'épica'],
        ['tab', 'panel'],
      ];
    }
    return [
      ['j/k', 'mover'],
      ['enter', 'historias'],
      ['n', hasEpic ? 'nueva HU' : 'nueva épica'],
      ['tab', 'panel'],
      ['ctrl+p', 'comandos'],
      ['t', 'tema'],
    ];
  }
  if (pane === 'stories') {
    const items: Array<readonly [string, string]> = [
      ['j/k', 'mover'],
      ['enter', 'detalle'],
      ['n', 'nueva'],
    ];
    if (hasStory && !compact) {
      items.push(['e', 'editar'], ['s', 'estado']);
    }
    items.push(['tab', 'panel'], ['esc', 'épicas']);
    return items;
  }
  return [
    ['j/k', 'subtarea'],
    ['espacio', 'marcar'],
    ...(hasStory && !compact
      ? ([['e', 'editar'], ['s', 'estado']] as Array<readonly [string, string]>)
      : []),
    ['tab', 'panel'],
    ['esc', 'historias'],
  ];
}
