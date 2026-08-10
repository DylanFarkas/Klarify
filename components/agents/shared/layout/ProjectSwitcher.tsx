'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';

export function ProjectSwitcher() {
  const { projects, activeProjectId, switchProject } = useWorkspace();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = projects.find((p) => p.id === activeProjectId);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleSelect = useCallback(
    async (projectId: string) => {
      setOpen(false);
      if (projectId !== activeProjectId) {
        await switchProject(projectId);
      }
    },
    [activeProjectId, switchProject]
  );

  return (
    <div ref={containerRef} className="relative border-t border-border pt-3.5">
      <div className="mb-1.5 flex items-center justify-between px-2.5">
        <p className="text-xs font-medium text-subtle">Cambiar proyecto</p>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
      >
        <span className="min-w-0 truncate font-medium text-foreground">
          {active?.name ?? 'Proyecto'}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-subtle transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <ul className="max-h-56 overflow-y-auto py-1">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => void handleSelect(project.id)}
                  className={`flex w-full cursor-pointer flex-col px-3 py-2 text-left text-sm hover:bg-surface-hover ${
                    project.id === activeProjectId ? 'bg-surface-hover text-foreground' : 'text-muted'
                  }`}
                >
                  <span className="truncate font-medium text-foreground">{project.name}</span>
                  <span className="text-xs text-subtle">{project.pipelineLabel}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border p-1">
            <Link
              href="/agentes/proyectos"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              Ver todos
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
