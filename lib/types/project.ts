/**
 * @fileoverview Tipos de proyectos multiproyecto en Firestore.
 */

import type { UserWorkspace } from '@/lib/types/workspace';
import type { GithubExportRecord } from '@/lib/types/github-export';
import type { WorkspaceMeta } from '@/lib/types/project-schema';

export type ProjectStatus = 'active' | 'locked';

export interface ProjectDocument {
  name: string;
  status: ProjectStatus;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  /** Legacy v1–v2. Ausente a partir de schemaVersion 4. */
  workspace?: UserWorkspace;
  schemaVersion?: number;
  workspaceMeta?: WorkspaceMeta;
  lastAgent?: string;
  githubExport?: GithubExportRecord;
  /** Denormalizados para listados sin normalizar el workspace completo */
  pipelineStep?: number;
  pipelineLabel?: string;
  completionPercentage?: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  updatedAt: number;
  lastAgent: string;
  pipelineStep: number;
  pipelineLabel: string;
  completionPercentage: number;
}

export interface ProjectSlotsInfo {
  maxActive: number;
  activeCount: number;
  lockedCount: number;
  /** El usuario puede elegir/cambiar qué proyectos están activos. */
  canChangeSelection: boolean;
}

export interface ProjectsListResponse {
  projects: ProjectSummary[];
  activeProjectId: string | null;
  slots: ProjectSlotsInfo;
}
