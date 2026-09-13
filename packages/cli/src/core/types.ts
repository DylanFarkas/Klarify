export type KanbanStatus = 'todo' | 'in_progress' | 'code_review' | 'done';
export type WorkItemType = 'story' | 'bug' | 'task';
export type SprintRollover = 'backlog' | 'next_planned';

export const KANBAN_STATUSES: KanbanStatus[] = ['todo', 'in_progress', 'code_review', 'done'];

export const KANBAN_LABELS: Record<KanbanStatus, string> = {
  todo: 'To-do',
  in_progress: 'En curso',
  code_review: 'Review',
  done: 'Hecho',
};

export interface StorySubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  pipelineLabel: string;
  status?: 'active' | 'locked';
  updatedAt?: number;
  pipelineStep?: number;
  completionPercentage?: number;
}

export interface ProjectList {
  projects: ProjectSummary[];
  activeProjectId: string | null;
  plan?: { id: string; limits?: { maxProjects?: number } };
}

export interface Whoami {
  uid: string;
  activeProjectId: string | null;
  plan: { id: string; limits?: { maxProjects?: number } };
  projectCount: number;
  email: string | null;
}

export interface BacklogStory {
  id: string;
  type: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  subtasks: StorySubtask[];
  severity: string | null;
  stepsToReproduce: string[] | null;
  technicalNotes: string | null;
  points: number | null;
  effort?: string | null;
  priority: string | null;
  sprintId: string | null;
  status: KanbanStatus | null;
  assigneeId: string | null;
  epicId?: string;
  epicTitle?: string;
}

export interface BacklogEpic {
  id: string;
  title: string;
  description: string;
  stories: BacklogStory[];
}

export interface BacklogSprint {
  id: string;
  number: number;
  goal: string;
  status: string;
  storyIds: string[];
  startDate?: string;
  endDate?: string;
}

export interface LiveBacklog {
  estimationMode: string;
  framework: string | null;
  epics: BacklogEpic[];
  sprints: BacklogSprint[];
  unassignedStoryIds: string[];
  stack: unknown;
}

export interface UseProjectResult {
  project: { id: string; name?: string };
  activeProjectId: string;
  backlog?: LiveBacklog;
}

export interface CompactStory {
  id: string;
  type: string;
  title: string;
  epicId: string;
  epicTitle: string;
  description: string;
  acceptanceCriteria: string[];
  subtasks: StorySubtask[];
  points: number | null;
  duration: string | null;
  priority: string | null;
  sprintId: string | null;
  status: KanbanStatus | null;
}

export interface DeviceStart {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  interval: number;
  expiresIn: number;
}

export interface DevicePoll {
  status: string;
  token?: string;
  interval?: number;
}

export interface CreateStoryInput {
  epicId: string;
  title: string;
  description: string;
  type?: WorkItemType;
  acceptanceCriteria?: string[];
  subtasks?: string[];
  points?: number;
  duration?: string;
  category?: string;
  sprintId?: string;
  severity?: string;
  stepsToReproduce?: string[];
}

export interface UpdateStoryInput {
  title?: string;
  description?: string;
  acceptanceCriteria?: string[];
  subtasks?: string[];
  points?: number;
  duration?: string;
  category?: string;
  sprintId?: string | null;
  epicId?: string;
}

export interface CreateEpicInput {
  title: string;
  description: string;
}

export interface ContextResult {
  format?: string;
  content?: string;
  compact?: unknown;
}
