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

export interface GithubProjectSummary {
  id: string;
  number: number;
  title: string;
  url: string;
  owner: string;
  ownerType: 'User' | 'Organization';
}
