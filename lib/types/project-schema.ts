/**
 * @fileoverview Versiones de schema y tipos físicos del proyecto en Firestore.
 *
 * En memoria el contrato sigue siendo `UserWorkspace`. En disco, a partir de
 * schemaVersion 4 el documento raíz solo guarda metadatos y punteros.
 */

import type { UploadedFile, Wish, ContextDiscovery } from '@/lib/types/agent-1';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import type { EstimationMode, StoryEstimation } from '@/lib/types/agent-3';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { SprintPlan } from '@/lib/types/agent-5';
import type { ProjectMember } from '@/lib/types/execution';
import type { ProjectStack } from '@/lib/types/stack';

export const SCHEMA_VERSION_MONOLITH = 1;
export const SCHEMA_VERSION_COMPACT = 2;
export const SCHEMA_VERSION_SUBCOLLECTIONS = 3;
export const SCHEMA_VERSION_CANONICAL = 4;
export const SCHEMA_VERSION_CURRENT = SCHEMA_VERSION_CANONICAL;

export type SchemaVersion = 1 | 2 | 3 | 4;

export type WorkspaceScope = 'shell' | 'agent1' | 'pipeline' | 'full';

export const TRANSCRIPTION_PREVIEW_CHARS = 400;
export const TRANSCRIPTION_ARTIFACT_ID = 'transcription' as const;

export interface TranscriptionPointer {
  artifactId: typeof TRANSCRIPTION_ARTIFACT_ID;
  duration: number;
  language: string;
  preview: string;
  segmentCount: number;
}

export interface TranscriptionArtifact {
  fullText: string;
  segments: import('@/lib/types/agent-1').TranscriptionSegment[];
  duration: number;
  language: string;
  updatedAt: number;
}

export interface AgentSliceStub {
  status: string;
  error: string | null;
  epicCount?: number;
  storyCount?: number;
}

export interface WorkspaceMeta {
  agent1: {
    status: string;
    error: string | null;
    file: UploadedFile | null;
    discovery: ContextDiscovery | null;
    enrichedContext: string | null;
    wishes: Wish[];
    transcription: TranscriptionPointer | null;
  };
  agent2: AgentSliceStub;
  agent3: AgentSliceStub & { estimationMode?: EstimationMode | null };
  agent4: AgentSliceStub & { framework?: PrioritizationFramework };
  agent5: AgentSliceStub;
  executionInitializedAt?: number | null;
  sprintFilter?: string;
  members?: ProjectMember[];
  stack?: ProjectStack | null;
}

export interface PipelineMeta {
  estimations: Record<string, StoryEstimation>;
  estimationMode?: EstimationMode;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework | null;
  plan: SprintPlan | null;
  sourceWishIds: string[];
  currentStep: number;
  approvedAt?: number;
}

export interface StoredEpic {
  id: string;
  title: string;
  description: string;
  source: Epic['source'];
  isEdited: boolean;
  createdAt: number;
  storyIds: string[];
}

export interface StoredStory extends UserStory {
  epicId: string;
}

export const PIPELINE_HISTORY_KEYS = [
  'agent2',
  'agent3',
  'agent4',
  'agent5',
  'agent2Input',
  'agent3Input',
  'agent4Input',
  'agent5Input',
] as const;

export type PipelineHistoryKey = (typeof PIPELINE_HISTORY_KEYS)[number];
