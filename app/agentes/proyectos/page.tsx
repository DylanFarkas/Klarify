'use client';

import { ProjectsHub } from '@/components/agents/projects/ProjectsHub';
import { WorkspaceHomeShell } from '@/components/agents/shared/layout/WorkspaceHomeShell';
import { useWorkspace } from '@/hooks/useWorkspace';

export default function ProyectosPage() {
  const { projects, isLoading } = useWorkspace();

  // Mantener el loader hasta hidratar proyectos: evita el flash de "sin proyectos".
  if (isLoading) {
    return (
      <WorkspaceHomeShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      </WorkspaceHomeShell>
    );
  }

  return (
    <WorkspaceHomeShell>
      <ProjectsHub initialProjects={projects} />
    </WorkspaceHomeShell>
  );
}
