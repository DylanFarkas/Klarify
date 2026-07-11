/**
 * @fileoverview Tipos para exportación a GitHub Projects.
 */

export interface GithubIssueMapping {
  issueNumber: number;
  nodeId: string;
}

export interface GithubExportRecord {
  repoFullName: string;
  githubProjectId: string;
  githubProjectUrl: string;
  lastExportAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  mappings: {
    epics: Record<string, GithubIssueMapping>;
    stories: Record<string, GithubIssueMapping>;
    milestones: Record<string, { number: number }>;
  };
}

export interface GithubExportDestination {
  mode: 'create' | 'existing';
  projectTitle?: string;
  githubProjectId?: string;
}

export interface GithubExportRepoTarget {
  mode: 'existing' | 'create';
  /** Repositorio existente: owner/repo */
  fullName?: string;
  /** Nombre del repo nuevo (sin owner) */
  name?: string;
  description?: string;
  private?: boolean;
}

export interface GithubExportOptions {
  createEpicIssues?: boolean;
  createMilestones?: boolean;
}

export interface GithubExportRequest {
  projectId: string;
  /** @deprecated Usar `repo` */
  repoFullName?: string;
  repo?: GithubExportRepoTarget;
  destination: GithubExportDestination;
  options?: GithubExportOptions;
}

export interface GithubExportSummary {
  epicsCreated: number;
  epicsUpdated: number;
  storiesCreated: number;
  storiesUpdated: number;
  milestonesCreated: number;
  itemsAddedToProject: number;
}

export interface GithubExportResponse {
  success: true;
  githubProjectUrl: string;
  githubProjectId: string;
  repoFullName: string;
  repoUrl: string;
  repoCreated: boolean;
  summary: GithubExportSummary;
  warnings?: string[];
}

/** Fases del proceso de exportación (para feedback en UI). */
export type GithubExportPhase =
  | 'preparing'
  | 'repository'
  | 'project'
  | 'fields'
  | 'labels'
  | 'milestones'
  | 'epics'
  | 'stories'
  | 'saving';

export interface GithubExportProgressEvent {
  type: 'progress';
  phase: GithubExportPhase;
  label: string;
  /** Índice actual dentro de la fase (1-based cuando hay total). */
  current?: number;
  total?: number;
  /** Detalle opcional (p. ej. título de la historia). */
  detail?: string;
}

export type GithubExportStreamEvent =
  | GithubExportProgressEvent
  | { type: 'done'; payload: GithubExportResponse }
  | { type: 'error'; error: string; code?: string };

export interface GithubProjectSummary {
  id: string;
  number: number;
  title: string;
  url: string;
  owner: string;
  ownerType: 'User' | 'Organization';
}
