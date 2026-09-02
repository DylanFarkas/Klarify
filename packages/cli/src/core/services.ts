import { api, apiPublic, projectPath } from './client';
import { loadConfig, requireProject, saveConfig, type KlarifyConfig } from './config';
import type {
  BacklogEpic,
  BacklogSprint,
  BacklogStory,
  CompactStory,
  ContextResult,
  CreateEpicInput,
  CreateStoryInput,
  DevicePoll,
  DeviceStart,
  KanbanStatus,
  LiveBacklog,
  ProjectList,
  SprintRollover,
  UpdateStoryInput,
  UseProjectResult,
  Whoami,
} from './types';

export async function resolveProjectId(flag?: string): Promise<string> {
  const config = await loadConfig();
  return requireProject(config, flag);
}

export async function whoami(): Promise<Whoami> {
  return (await api('/api/v1/me')) as Whoami;
}

export async function listProjects(): Promise<ProjectList> {
  return (await api('/api/v1/projects')) as ProjectList;
}

export async function createProject(name: string): Promise<{ project: { id: string; name?: string } }> {
  return (await api('/api/v1/projects', {
    method: 'POST',
    json: { name },
  })) as { project: { id: string; name?: string } };
}

export async function useProject(projectId: string): Promise<UseProjectResult> {
  const body = (await api(`/api/v1/projects/${encodeURIComponent(projectId)}/use`, {
    method: 'POST',
  })) as UseProjectResult;
  await saveConfig({ projectId });
  return body;
}

export async function getContext(
  projectId: string,
  options: { full?: boolean; format?: 'json' | 'markdown' } = {}
): Promise<ContextResult> {
  const qs = new URLSearchParams();
  if (options.full) qs.set('full', '1');
  qs.set('format', options.format === 'markdown' ? 'markdown' : 'json');
  return (await api(`${projectPath(projectId)}/context?${qs.toString()}`)) as ContextResult;
}

export async function getNext(projectId: string): Promise<unknown> {
  return api(`${projectPath(projectId)}/next`);
}

export async function listBacklog(projectId: string): Promise<LiveBacklog> {
  return (await api(`${projectPath(projectId)}/backlog`)) as LiveBacklog;
}

export async function importBacklog(projectId: string, payload: unknown): Promise<unknown> {
  return api(`${projectPath(projectId)}/backlog/import`, { method: 'POST', json: payload });
}

export async function listEpics(projectId: string): Promise<{ epics: BacklogEpic[] }> {
  return (await api(`${projectPath(projectId)}/epics`)) as { epics: BacklogEpic[] };
}

export async function createEpic(projectId: string, input: CreateEpicInput): Promise<unknown> {
  return api(`${projectPath(projectId)}/epics`, { method: 'POST', json: input });
}

export async function updateEpic(
  projectId: string,
  epicId: string,
  patch: { title?: string; description?: string }
): Promise<unknown> {
  return api(`${projectPath(projectId)}/epics/${encodeURIComponent(epicId)}`, {
    method: 'PATCH',
    json: patch,
  });
}

export async function deleteEpic(projectId: string, epicId: string, confirm: boolean): Promise<unknown> {
  const qs = confirm ? '?confirm=true' : '';
  return api(`${projectPath(projectId)}/epics/${encodeURIComponent(epicId)}${qs}`, {
    method: 'DELETE',
  });
}

export async function listStories(projectId: string): Promise<{ stories: BacklogStory[] }> {
  return (await api(`${projectPath(projectId)}/stories`)) as { stories: BacklogStory[] };
}

export async function getStory(projectId: string, storyId: string): Promise<{ story: CompactStory }> {
  return (await api(
    `${projectPath(projectId)}/stories/${encodeURIComponent(storyId)}`
  )) as { story: CompactStory };
}

export async function createStory(projectId: string, input: CreateStoryInput): Promise<unknown> {
  return api(`${projectPath(projectId)}/stories`, {
    method: 'POST',
    json: {
      epicId: input.epicId,
      title: input.title,
      description: input.description,
      type: input.type,
      acceptanceCriteria: input.acceptanceCriteria,
      subtasks: input.subtasks,
      points: input.points,
      duration: input.duration,
      category: input.category,
      sprintId: input.sprintId,
      severity: input.severity,
      stepsToReproduce: input.stepsToReproduce,
    },
  });
}

export async function updateStory(
  projectId: string,
  storyId: string,
  patch: UpdateStoryInput
): Promise<unknown> {
  return api(`${projectPath(projectId)}/stories/${encodeURIComponent(storyId)}`, {
    method: 'PATCH',
    json: patch,
  });
}

export async function deleteStory(projectId: string, storyId: string, confirm: boolean): Promise<unknown> {
  const qs = confirm ? '?confirm=true' : '';
  return api(`${projectPath(projectId)}/stories/${encodeURIComponent(storyId)}${qs}`, {
    method: 'DELETE',
  });
}

export async function setStatus(
  projectId: string,
  storyId: string,
  status: KanbanStatus
): Promise<unknown> {
  return api(`${projectPath(projectId)}/stories/${encodeURIComponent(storyId)}/status`, {
    method: 'POST',
    json: { status },
  });
}

export async function addSubtask(projectId: string, storyId: string, title: string): Promise<unknown> {
  return api(`${projectPath(projectId)}/stories/${encodeURIComponent(storyId)}/subtasks`, {
    method: 'POST',
    json: { title },
  });
}

export async function updateSubtask(
  projectId: string,
  storyId: string,
  subtaskId: string,
  patch: { title?: string; done?: boolean }
): Promise<unknown> {
  return api(
    `${projectPath(projectId)}/stories/${encodeURIComponent(storyId)}/subtasks/${encodeURIComponent(subtaskId)}`,
    { method: 'PATCH', json: patch }
  );
}

export async function deleteSubtask(
  projectId: string,
  storyId: string,
  subtaskId: string
): Promise<unknown> {
  return api(
    `${projectPath(projectId)}/stories/${encodeURIComponent(storyId)}/subtasks/${encodeURIComponent(subtaskId)}`,
    { method: 'DELETE' }
  );
}

export async function listSprints(
  projectId: string
): Promise<{ sprints: BacklogSprint[]; unassignedStoryIds?: string[] }> {
  return (await api(`${projectPath(projectId)}/sprints`)) as {
    sprints: BacklogSprint[];
    unassignedStoryIds?: string[];
  };
}

export async function createSprint(projectId: string, goal?: string): Promise<unknown> {
  return api(`${projectPath(projectId)}/sprints`, { method: 'POST', json: { goal } });
}

export async function updateSprint(
  projectId: string,
  sprintId: string,
  patch: { goal?: string; startDate?: string; endDate?: string }
): Promise<unknown> {
  return api(`${projectPath(projectId)}/sprints/${encodeURIComponent(sprintId)}`, {
    method: 'PATCH',
    json: patch,
  });
}

export async function startSprint(projectId: string, sprintId: string): Promise<unknown> {
  return api(`${projectPath(projectId)}/sprints/${encodeURIComponent(sprintId)}/start`, {
    method: 'POST',
  });
}

export async function completeSprint(
  projectId: string,
  sprintId: string,
  rollover?: SprintRollover
): Promise<unknown> {
  return api(`${projectPath(projectId)}/sprints/${encodeURIComponent(sprintId)}/complete`, {
    method: 'POST',
    json: { rollover },
  });
}

export async function deleteSprint(
  projectId: string,
  sprintId: string,
  confirm: boolean
): Promise<unknown> {
  const qs = confirm ? '?confirm=true' : '';
  return api(`${projectPath(projectId)}/sprints/${encodeURIComponent(sprintId)}${qs}`, {
    method: 'DELETE',
  });
}

export async function getStack(projectId: string): Promise<unknown> {
  return api(`${projectPath(projectId)}/stack`);
}

export async function saveStack(
  projectId: string,
  input: {
    productKind: string;
    architecturePattern: string;
    layers: Record<string, unknown>;
    rationale?: string;
  }
): Promise<unknown> {
  return api(`${projectPath(projectId)}/stack`, { method: 'PUT', json: input });
}

export async function startDeviceLogin(apiUrl: string): Promise<DeviceStart> {
  return (await apiPublic(apiUrl, '/api/v1/auth/device', { method: 'POST' })) as DeviceStart;
}

export async function pollDeviceLogin(apiUrl: string, deviceCode: string): Promise<DevicePoll> {
  return (await apiPublic(
    apiUrl,
    `/api/v1/auth/device?device_code=${encodeURIComponent(deviceCode)}`
  )) as DevicePoll;
}

export async function loginWithToken(token: string, apiUrl?: string): Promise<KlarifyConfig> {
  const resolved = apiUrl || (await loadConfig()).apiUrl;
  return saveConfig({ apiUrl: resolved, token });
}

export async function finishDeviceLogin(apiUrl: string, token: string): Promise<KlarifyConfig> {
  return saveConfig({ apiUrl, token });
}
