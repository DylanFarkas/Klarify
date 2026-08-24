import 'server-only';

export { loadWorkspace } from '@/lib/project-store/load';
export {
  persistWorkspace,
  persistExecutionStories,
  persistExecutionStoryFields,
  persistExecutionWorkspaceMeta,
  persistAgent1Only,
  persistCanonicalStoryPatch,
  persistCanonicalEpicPatch,
  persistCanonicalBacklogWrite,
  persistSprintFilterOnly,
  persistSprintPlanOnly,
  persistStackOnly,
  readBacklogIds,
  readCanonicalStory,
  readCanonicalEpic,
  readPipelineMeta,
  readProjectStack,
  readExecutionStory,
  readExecutionStories,
  readPipelinePlan,
  stubWorkspaceAfterDashboard,
} from '@/lib/project-store/persist';
export type { CanonicalBacklogWrite, PersistSlice } from '@/lib/project-store/persist';
export { ensureCanonicalWorkspace } from '@/lib/project-store/migrate';
export { deleteProjectSlices } from '@/lib/project-store/cleanup';
export {
  parseWorkspaceScope,
  scopeFromPathname,
  applyWorkspaceScope,
  mergeScopedWorkspace,
} from '@/lib/project-store/scope';
export {
  projectRef,
  projectsColRef,
  userDocRef,
} from '@/lib/project-store/paths';
