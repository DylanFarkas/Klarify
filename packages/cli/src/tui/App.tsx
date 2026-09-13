import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput, useWindowSize } from 'ink';
import { Spinner } from '@inkjs/ui';
import { ApiError } from '../core/client';
import { loadConfig } from '../core/config';
import { deleteStory, listBacklog, listProjects, updateSubtask, whoami } from '../core/services';
import type { BacklogStory, KanbanStatus, LiveBacklog, ProjectSummary, Whoami } from '../core/types';
import { CommandPalette } from './components/CommandPalette';
import { ConfirmModal } from './components/ConfirmModal';
import { Footer, Header } from './components/Chrome';
import { Landing } from './components/Landing';
import { buildPaletteCommands, isCtrlP, type PaletteCommandId } from './palette';
import { ThemeScreen } from './screens/ThemeScreen';
import { useTheme } from './theme';
import { formatPlanName } from './pipeline';
import { EpicFormScreen } from './screens/EpicFormScreen';
import { HelpScreen } from './screens/HelpScreen';
import { EMPTY_WORK_CURSOR, HomeScreen, type WorkCursor } from './screens/HomeScreen';
import { ImportScreen } from './screens/ImportScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { SprintsScreen } from './screens/SprintsScreen';
import { StatusScreen } from './screens/StatusScreen';
import { StoryFormScreen } from './screens/StoryFormScreen';

type Screen =
  | 'boot'
  | 'login'
  | 'projects'
  | 'home'
  | 'story-create'
  | 'story-edit'
  | 'epic-form'
  | 'status'
  | 'sprints'
  | 'import'
  | 'help'
  | 'theme';

type Confirm = { title: string; detail: string; action: () => Promise<void> };

const PALETTE_SCREENS: Screen[] = ['projects', 'home', 'sprints', 'help', 'status'];
const PROJECTS_TTL_MS = 30_000;

function mapBacklogStory(
  backlog: LiveBacklog,
  storyId: string,
  patch: (story: BacklogStory) => BacklogStory,
): LiveBacklog {
  return {
    ...backlog,
    epics: backlog.epics.map((epic) => ({
      ...epic,
      stories: epic.stories.map((story) => (story.id === storyId ? patch(story) : story)),
    })),
  };
}

function storyWithEpic(backlog: LiveBacklog | null, storyId?: string): BacklogStory | undefined {
  if (!backlog || !storyId) return undefined;
  for (const epic of backlog.epics) {
    const found = epic.stories.find((item) => item.id === storyId);
    if (found) return { ...found, epicId: epic.id };
  }
}

export function App() {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const [screen, setScreen] = useState<Screen>('boot');
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Whoami | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsFetchedAt, setProjectsFetchedAt] = useState(0);
  const [backlog, setBacklog] = useState<LiveBacklog | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [draftEpicId, setDraftEpicId] = useState<string | undefined>();
  const [editStoryId, setEditStoryId] = useState<string | undefined>();
  const [statusStory, setStatusStory] = useState<BacklogStory | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [helpFrom, setHelpFrom] = useState<Screen>('projects');
  const [projectsFromHome, setProjectsFromHome] = useState(false);
  const [workCursor, setWorkCursor] = useState<WorkCursor>(EMPTY_WORK_CURSOR);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [themeFrom, setThemeFrom] = useState<Screen>('projects');
  const { colors } = useTheme();

  const onError = useCallback((message: string) => setError(message), []);

  const rememberCursor = useCallback((next: WorkCursor) => {
    setWorkCursor((current) =>
      current.pane === next.pane && current.epicId === next.epicId && current.storyId === next.storyId
        ? current
        : next,
    );
  }, []);

  const rememberProjects = useCallback((listed: ProjectSummary[]) => {
    setProjects(listed);
    setProjectsFetchedAt(Date.now());
  }, []);

  const refreshBacklog = useCallback(
    async (nextProjectId: string, options?: { background?: boolean }) => {
      const background = Boolean(options?.background);
      if (background) setRefreshing(true);
      else setError(null);
      try {
        const data = await listBacklog(nextProjectId);
        setBacklog(data);
        setProjectId(nextProjectId);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (background) {
          onError(message);
          return undefined;
        }
        throw err;
      } finally {
        if (background) setRefreshing(false);
      }
    },
    [onError],
  );

  const boot = useCallback(async () => {
    setScreen('boot');
    setError(null);
    try {
      const config = await loadConfig();
      if (!config.token) {
        setScreen('login');
        return;
      }
      const [user, listed] = await Promise.all([whoami(), listProjects()]);
      setMe({ ...user, projectCount: listed.projects.length });
      rememberProjects(listed.projects);
      setProjectId(config.projectId || listed.activeProjectId || listed.projects[0]?.id || null);
      setProjectsFromHome(false);
      setScreen('projects');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setScreen('login');
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setScreen('login');
    }
  }, [rememberProjects]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const handleLoggedIn = useCallback(() => {
    void boot();
  }, [boot]);

  const projectName =
    projects.find((item) => item.id === projectId)?.name ?? projectId ?? 'sin proyecto';
  const userLabel = me?.email || (me?.plan.id ? `Plan ${formatPlanName(me.plan.id)}` : '');
  const storyCount = backlog?.epics.reduce((n, epic) => n + epic.stories.length, 0) ?? 0;
  const headerMeta = backlog ? `${backlog.epics.length} épicas · ${storyCount} HU` : undefined;
  const listHeight = Math.max(6, rows - 8);
  const blocking = Boolean(confirm);
  const selectedEpic = backlog?.epics.find((epic) => epic.id === workCursor.epicId) ?? backlog?.epics[0];
  const selectedStory =
    selectedEpic?.stories.find((item) => item.id === workCursor.storyId) ?? selectedEpic?.stories[0];
  const editStory = storyWithEpic(backlog, editStoryId);
  const paletteCommands = useMemo(
    () =>
      buildPaletteCommands({
        hasProject: Boolean(projectId),
        hasEpic: Boolean(selectedEpic),
        hasStory: Boolean(selectedStory),
        onProjectsScreen: screen === 'projects',
      }),
    [projectId, selectedEpic, selectedStory, screen],
  );

  useInput((input, key) => {
    if (key.eventType === 'release') return;
    if (!isCtrlP(input, key)) return;
    if (blocking) return;
    if (!PALETTE_SCREENS.includes(screen)) return;
    setPaletteOpen((open) => !open);
  });

  function fail(err: unknown) {
    onError(err instanceof Error ? err.message : String(err));
  }

  function goHome(refresh = true) {
    setPaletteOpen(false);
    setScreen('home');
    if (!refresh || !projectId) return;
    void refreshBacklog(projectId, { background: Boolean(backlog) }).catch(fail);
  }

  function openWorkspace(nextProjectId: string, usedBacklog?: LiveBacklog) {
    setProjectsFromHome(false);
    if (nextProjectId !== projectId) setWorkCursor(EMPTY_WORK_CURSOR);
    if (!projects.some((item) => item.id === nextProjectId)) {
      setProjectsFetchedAt(0);
    }
    if (usedBacklog) {
      setBacklog(usedBacklog);
      setProjectId(nextProjectId);
      setScreen('home');
      return;
    }
    if (nextProjectId === projectId && backlog) {
      setScreen('home');
      void refreshBacklog(nextProjectId, { background: true }).catch(fail);
      return;
    }
    setProjectId(nextProjectId);
    setBacklog(null);
    setScreen('home');
    void refreshBacklog(nextProjectId).catch(fail);
  }

  function openProjects(fromWork: boolean) {
    setProjectsFromHome(fromWork);
    setScreen('projects');
    const fresh = projects.length > 0 && Date.now() - projectsFetchedAt < PROJECTS_TTL_MS;
    if (fresh) return;
    void listProjects()
      .then((listed) => rememberProjects(listed.projects))
      .catch(fail);
  }

  function openSprints() {
    if (!projectId) return;
    setScreen('sprints');
    if (backlog) {
      void refreshBacklog(projectId, { background: true }).catch(fail);
      return;
    }
    void refreshBacklog(projectId).catch(fail);
  }

  function toggleSubtask(storyId: string, subtaskId: string, done: boolean) {
    if (!projectId || !backlog) return;
    const previous = backlog;
    setBacklog(
      mapBacklogStory(backlog, storyId, (story) => ({
        ...story,
        subtasks: story.subtasks.map((item) => (item.id === subtaskId ? { ...item, done } : item)),
      })),
    );
    void updateSubtask(projectId, storyId, subtaskId, { done }).catch((err: unknown) => {
      setBacklog(previous);
      fail(err);
    });
  }

  function applyStatus(storyId: string, status: KanbanStatus) {
    setBacklog((current) =>
      current ? mapBacklogStory(current, storyId, (story) => ({ ...story, status })) : current,
    );
    goHome(false);
  }

  function runPalette(id: PaletteCommandId) {
    setPaletteOpen(false);
    switch (id) {
      case 'new-story': {
        const epicId = selectedEpic?.id ?? workCursor.epicId;
        if (!epicId) {
          setScreen('epic-form');
          return;
        }
        setDraftEpicId(epicId);
        setScreen('story-create');
        return;
      }
      case 'new-epic':
        setScreen('epic-form');
        return;
      case 'edit-story':
        if (!selectedStory) return;
        setEditStoryId(selectedStory.id);
        setScreen('story-edit');
        return;
      case 'change-status':
        if (!selectedStory) return;
        setStatusStory(selectedStory);
        setScreen('status');
        return;
      case 'delete-story':
        if (!projectId || !selectedStory) return;
        setConfirm({
          title: `Eliminar ${selectedStory.id}`,
          detail: selectedStory.title,
          action: async () => {
            await deleteStory(projectId, selectedStory.id, true);
            await refreshBacklog(projectId);
          },
        });
        return;
      case 'import':
        setScreen('import');
        return;
      case 'sprints':
        openSprints();
        return;
      case 'projects':
        openProjects(screen !== 'projects');
        return;
      case 'reload':
        if (screen === 'projects') {
          void listProjects()
            .then((listed) => rememberProjects(listed.projects))
            .catch(fail);
          return;
        }
        if (projectId) {
          void refreshBacklog(projectId, { background: Boolean(backlog) }).catch(fail);
        }
        return;
      case 'help':
        if (screen !== 'help') setHelpFrom(screen);
        setScreen('help');
        return;
      case 'theme':
        if (screen !== 'theme') setThemeFrom(screen);
        setScreen('theme');
    }
  }

  const body = (() => {
    if (screen === 'boot') {
      return (
        <Landing columns={columns} rows={rows} title="Proyectos" meta="Cargando tu workspace…" showPath={false}>
          <Spinner label="Un momento" />
        </Landing>
      );
    }
    if (screen === 'login') {
      return <LoginScreen onLoggedIn={handleLoggedIn} onQuit={() => exit()} />;
    }
    if (screen === 'theme') {
      return (
        <ThemeScreen
          columns={columns}
          rows={rows}
          showBrand={themeFrom === 'projects' || themeFrom === 'boot'}
          onBack={() => setScreen(themeFrom === 'theme' ? 'projects' : themeFrom)}
        />
      );
    }
    if (screen === 'projects') {
      return (
        <ProjectsScreen
          projects={projects}
          activeProjectId={projectId}
          instantOpenId={backlog && projectId ? projectId : null}
          me={me}
          error={error}
          onPicked={openWorkspace}
          onQuit={() => exit()}
          onBack={
            projectsFromHome
              ? () => {
                  setProjectsFromHome(false);
                  setScreen('home');
                }
              : undefined
          }
          onError={onError}
          onTheme={() => {
            setThemeFrom('projects');
            setScreen('theme');
          }}
        />
      );
    }
    if (screen === 'help') {
      return <HelpScreen active={!blocking && !paletteOpen} onBack={() => setScreen(helpFrom)} />;
    }
    if (!projectId) {
      return (
        <Box padding={1}>
          <Text color={colors.muted}>Elige un proyecto.</Text>
        </Box>
      );
    }
    if (screen === 'story-create' || screen === 'story-edit') {
      return (
        <StoryFormScreen
          projectId={projectId}
          epics={backlog?.epics ?? []}
          mode={screen === 'story-create' ? 'create' : 'edit'}
          storyId={editStoryId}
          story={editStory}
          defaultEpicId={draftEpicId}
          onDone={() => goHome(true)}
          onCancel={() => setScreen('home')}
          onError={onError}
        />
      );
    }
    if (screen === 'epic-form') {
      return (
        <EpicFormScreen
          projectId={projectId}
          onDone={() => goHome(true)}
          onCancel={() => setScreen('home')}
          onError={onError}
        />
      );
    }
    if (screen === 'status' && statusStory) {
      return (
        <StatusScreen
          projectId={projectId}
          storyId={statusStory.id}
          current={statusStory.status}
          onDone={(status) => applyStatus(statusStory.id, status)}
          onCancel={() => setScreen('home')}
          onError={onError}
        />
      );
    }
    if (screen === 'sprints') {
      return (
        <SprintsScreen
          projectId={projectId}
          sprints={backlog?.sprints ?? []}
          listHeight={listHeight}
          onBack={() => setScreen('home')}
          onReload={() => void refreshBacklog(projectId, { background: Boolean(backlog) }).catch(fail)}
          onError={onError}
          onAskConfirm={(title, detail, action) => setConfirm({ title, detail, action })}
        />
      );
    }
    if (screen === 'import') {
      return (
        <ImportScreen
          projectId={projectId}
          onDone={() => goHome(true)}
          onCancel={() => setScreen('home')}
          onError={onError}
        />
      );
    }
    if (!backlog) {
      return (
        <Box padding={1}>
          <Spinner label="Cargando backlog…" />
        </Box>
      );
    }
    return (
      <HomeScreen
        key={projectId}
        backlog={backlog}
        listHeight={listHeight}
        columns={columns}
        active={!blocking && !paletteOpen && screen === 'home'}
        onCreateStory={(epicId) => {
          setDraftEpicId(epicId);
          setScreen('story-create');
        }}
        onEditStory={(storyId) => {
          setEditStoryId(storyId);
          setScreen('story-edit');
        }}
        onStatus={(storyId) => {
          const found = backlog.epics.flatMap((epic) => epic.stories).find((item) => item.id === storyId);
          if (found) {
            setStatusStory(found);
            setScreen('status');
          }
        }}
        onDeleteStory={(story) => {
          setConfirm({
            title: `Eliminar ${story.id}`,
            detail: story.title,
            action: async () => {
              await deleteStory(projectId, story.id, true);
              await refreshBacklog(projectId);
            },
          });
        }}
        onCreateEpic={() => setScreen('epic-form')}
        onSprints={openSprints}
        onImport={() => setScreen('import')}
        onProjects={() => openProjects(true)}
        onHelp={() => {
          setHelpFrom('home');
          setScreen('help');
        }}
        onReload={() => void refreshBacklog(projectId, { background: true }).catch(fail)}
        onQuit={() => openProjects(false)}
        onToggleSubtask={toggleSubtask}
        onTheme={() => {
          setThemeFrom('home');
          setScreen('theme');
        }}
        cursor={workCursor}
        onCursorChange={rememberCursor}
      />
    );
  })();

  const hints =
    screen === 'login'
      ? 'device flow o PAT'
      : 'esc vuelve · ctrl+c sale';

  const landing =
    screen === 'boot' ||
    screen === 'login' ||
    screen === 'projects' ||
    (screen === 'theme' && (themeFrom === 'projects' || themeFrom === 'boot'));
  const work = screen === 'home';

  return (
    <Box flexDirection="column" width={columns} height={rows} backgroundColor={colors.bg}>
      {landing ? null : (
        <Header
          project={projectName}
          meta={work ? headerMeta : undefined}
          user={userLabel}
          error={error}
          refreshing={refreshing}
          columns={columns}
        />
      )}
      <Box flexGrow={1} flexDirection="column" overflow="hidden" backgroundColor={colors.bg}>
        {paletteOpen ? (
          <CommandPalette
            columns={columns}
            rows={rows}
            commands={paletteCommands}
            showBrand={landing}
            onRun={runPalette}
            onClose={() => setPaletteOpen(false)}
          />
        ) : (
          body
        )}
      </Box>
      {confirm ? (
        <Box justifyContent="center" padding={1}>
          <ConfirmModal
            title={confirm.title}
            detail={confirm.detail}
            onConfirm={() => {
              const action = confirm.action;
              setConfirm(null);
              void action().catch(fail);
            }}
            onCancel={() => setConfirm(null)}
          />
        </Box>
      ) : landing || work || paletteOpen ? null : (
        <Footer hints={hints} columns={columns} />
      )}
    </Box>
  );
}
