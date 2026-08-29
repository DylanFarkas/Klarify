'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import {
  sidebarGroupLabelClass,
  sidebarIconTileClass,
  sidebarLabelClass,
  sidebarRowClass,
} from './sidebar-styles';
import { useSidebarRailCollapsed } from './WorkspaceSidebarChrome';

export function ProjectSwitcher() {
  const { projects, activeProjectId, switchProject } = useWorkspace();
  const collapsed = useSidebarRailCollapsed();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const active = projects.find((p) => p.id === activeProjectId);
  const initial = (active?.name ?? 'P').charAt(0).toUpperCase();

  const updateMenuPos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = 240;
    if (collapsed) {
      const top = Math.min(rect.top, Math.max(12, window.innerHeight - menuHeight - 12));
      setMenuPos({ top, left: rect.right + 8, width: 224 });
      return;
    }
    setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [collapsed]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPos();

    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onReposition = () => updateMenuPos();

    document.addEventListener('mousedown', onClick);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updateMenuPos]);

  const handleSelect = useCallback(
    async (projectId: string) => {
      setOpen(false);
      if (projectId !== activeProjectId) {
        await switchProject(projectId);
      }
    },
    [activeProjectId, switchProject]
  );

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 overflow-hidden rounded-lg border border-border-strong bg-surface shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
          >
            <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
              {projects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={project.id === activeProjectId}
                    onClick={() => void handleSelect(project.id)}
                    className={`flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-surface-hover ${
                      project.id === activeProjectId ? 'bg-surface-hover text-foreground' : 'text-muted'
                    }`}
                  >
                    <span className={sidebarIconTileClass}>
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">{project.name}</span>
                      <span className="block truncate text-xs text-subtle">{project.pipelineLabel}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-border p-1">
              <Link
                href="/agentes/proyectos"
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover"
              >
                Ver todos
              </Link>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <p className={sidebarGroupLabelClass}>Proyectos</p>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) updateMenuPos();
          setOpen((v) => !v);
        }}
        title={active?.name ?? 'Proyecto'}
        className={`${sidebarRowClass} cursor-pointer text-left text-sm text-foreground hover:bg-surface-hover`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={sidebarIconTileClass}>{initial}</span>
        <span className={`${sidebarLabelClass} flex items-center gap-2 font-medium`}>
          <span className="min-w-0 truncate">{active?.name ?? 'Proyecto'}</span>
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-subtle ${open ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </span>
      </button>
      {menu}
    </div>
  );
}
