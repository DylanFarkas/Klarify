import { useCallback, useEffect, useState } from 'react';
import { Box, Text, useApp, useWindowSize } from 'ink';
import { Spinner } from '@inkjs/ui';
import { ApiError } from '../core/client';
import { loadConfig } from '../core/config';
import { deleteStory, listBacklog, listProjects, whoami } from '../core/services';
import type { BacklogStory, LiveBacklog, ProjectSummary, Whoami } from '../core/types';
import { ConfirmModal } from './components/ConfirmModal';
import { Footer, Header } from './components/Chrome';
import { colors } from './theme';
import { EpicFormScreen } from './screens/EpicFormScreen';
import { HelpScreen } from './screens/HelpScreen';
import { HomeScreen, HOME_HINTS } from './screens/HomeScreen';
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
  | 'help';

type Confirm = { title: string; detail: string; action: () => Promise<void> };

export function App() {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const [screen, setScreen] = useState<Screen>('boot');
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Whoami | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [backlog, setBacklog] = useState<LiveBacklog | null>(null);
  const [draftEpicId, setDraftEpicId] = useState<string | undefined>();
  const [editStoryId, setEditStoryId] = useState<string | undefined>();
  const [statusStory, setStatusStory] = useState<BacklogStory | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [helpFrom, setHelpFrom] = useState<Screen>('home');

  const onError = useCallback((message: string) => setError(message), []);

  const loadWorkspace = useCallback(async (nextProjectId: string) => {
    setError(null);
    const data = await listBacklog(nextProjectId);
    setBacklog(data);
    setProjectId(nextProjectId);
    setScreen('home');
  }, []);

  const boot = useCallback(async () => {
    setScreen('boot');
    setError(null);
    try {
      const config = await loadConfig();
      if (!config.token) {
        setScreen('login');
        return;
      }
      const user = await whoami();
      setMe(user);
      const listed = await listProjects();
      setProjects(listed.projects);
      const active = config.projectId || listed.activeProjectId || listed.projects[0]?.id;
      if (!active) {
        setScreen('projects');
        return;
      }
      await loadWorkspace(active);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setScreen('login');
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setScreen('login');
    }
  }, [loadWorkspace]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const handleLoggedIn = useCallback(() => {
    void boot();
  }, [boot]);

  const projectName =
    projects.find((item) => item.id === projectId)?.name ?? projectId ?? 'sin proyecto';
  const userLabel = me?.email ?? me?.plan.id ?? '';
  const listHeight = Math.max(6, rows - 6);
  const blocking = Boolean(confirm);

  function goHome() {
    setScreen('home');
    if (projectId) void loadWorkspace(projectId);
  }

  const body = (() => {
    if (screen === 'boot') {
      return (
        <Box padding={1}>
          <Spinner label="Cargando Klarify…" />
        </Box>
      );
    }
    if (screen === 'login') {
      return <LoginScreen onLoggedIn={handleLoggedIn} onQuit={() => exit()} />;
    }
    if (screen === 'projects') {
      return (
        <ProjectsScreen
          projects={projects}
          activeProjectId={projectId}
          listHeight={listHeight}
          onPicked={(id) => {
            void loadWorkspace(id).catch((err: unknown) =>
              onError(err instanceof Error ? err.message : String(err))
            );
          }}
          onQuit={() => exit()}
          onError={onError}
        />
      );
    }
    if (screen === 'help') {
      return <HelpScreen onBack={() => setScreen(helpFrom)} />;
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
          defaultEpicId={draftEpicId}
          onDone={goHome}
          onCancel={() => setScreen('home')}
          onError={onError}
        />
      );
    }
    if (screen === 'epic-form') {
      return (
        <EpicFormScreen
          projectId={projectId}
          onDone={goHome}
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
          onDone={goHome}
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
          onReload={() => void loadWorkspace(projectId)}
          onError={onError}
          onAskConfirm={(title, detail, action) => setConfirm({ title, detail, action })}
        />
      );
    }
    if (screen === 'import') {
      return (
        <ImportScreen
          projectId={projectId}
          onDone={goHome}
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
        backlog={backlog}
        projectId={projectId}
        listHeight={listHeight}
        active={!blocking && screen === 'home'}
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
              await loadWorkspace(projectId);
            },
          });
        }}
        onCreateEpic={() => setScreen('epic-form')}
        onSprints={() => setScreen('sprints')}
        onImport={() => setScreen('import')}
        onProjects={() => {
          void listProjects().then((listed) => {
            setProjects(listed.projects);
            setScreen('projects');
          });
        }}
        onHelp={() => {
          setHelpFrom('home');
          setScreen('help');
        }}
        onReload={() => void loadWorkspace(projectId)}
        onQuit={() => exit()}
        onError={onError}
      />
    );
  })();

  const hints =
    screen === 'home'
      ? HOME_HINTS
      : screen === 'login'
        ? 'device flow o PAT'
        : 'esc vuelve · ctrl+c sale';

  return (
    <Box flexDirection="column" width={columns} height={rows} backgroundColor={colors.panel}>
      <Header project={projectName} user={userLabel} error={error} />
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        {body}
      </Box>
      {confirm ? (
        <Box justifyContent="center" padding={1}>
          <ConfirmModal
            title={confirm.title}
            detail={confirm.detail}
            onConfirm={() => {
              const action = confirm.action;
              setConfirm(null);
              void action().catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)));
            }}
            onCancel={() => setConfirm(null)}
          />
        </Box>
      ) : (
        <Footer hints={hints} />
      )}
    </Box>
  );
}
