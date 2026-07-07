/**
 * @fileoverview Tipos de proyectos multiproyecto en Firestore.
 */

import type { UserWorkspace } from '@/lib/types/workspace';

export type ProjectStatus = 'active' | 'locked';

export interface ProjectDocument {
  name: string;
  status: ProjectStatus;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  workspace: UserWorkspace;
  lastAgent?: string;
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
