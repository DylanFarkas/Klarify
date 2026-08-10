'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProjectMember } from '@/lib/types/execution';
import { MEMBER_ROLE_LABELS, type ProjectMemberInput } from '@/lib/types/execution';
import { memberInitials } from '@/lib/board/board-utils';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import { errorMessage, notifyPromise } from '@/lib/notifications/toast';
import { MemberForm } from './MemberForm';

interface TeamPanelProps {
  members: ProjectMember[];
  maxMembers: number;
  onUpsert: (member: ProjectMemberInput) => Promise<void>;
  onDelete: (memberId: string) => Promise<void>;
}

const POPOVER_WIDTH = 320;
const VIEWPORT_PADDING = 12;

function computePopoverPosition(rect: DOMRect) {
  let left = rect.right - POPOVER_WIDTH;
  let top = rect.bottom + 8;

  if (left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
    left = window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING;
  }
  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING;
  }

  const maxHeight = Math.min(480, window.innerHeight - top - VIEWPORT_PADDING);
  if (maxHeight < 200) {
    top = Math.max(VIEWPORT_PADDING, rect.top - maxHeight - 8);
  }

  return { top, left, maxHeight: Math.min(480, window.innerHeight - top - VIEWPORT_PADDING) };
}

export function TeamPanel({ members, maxMembers, onUpsert, onDelete }: TeamPanelProps) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 480 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const atLimit = members.length >= maxMembers;
  const visibleAvatars = members.slice(0, 4);
  const overflow = members.length - visibleAvatars.length;

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(computePopoverPosition(rect));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
      setEditingId(null);
      setShowForm(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        setEditingId(null);
        setShowForm(false);
      }
    };

    const handleReposition = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, updatePosition]);

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      setEditingId(null);
      setShowForm(false);
    } else {
      updatePosition();
      setOpen(true);
    }
  };

  const handleCreate = async (data: ProjectMemberInput) => {
    try {
      await notifyPromise(onUpsert(data), {
        loading: { title: 'Añadiendo miembro…', description: data.displayName },
        success: { title: 'Miembro añadido', description: data.displayName },
        error: (err) => errorMessage(err, 'No se pudo añadir el miembro'),
      });
      setShowForm(false);
    } catch {
      // Toast de error ya mostrado por notifyPromise
    }
  };

  const handleEdit = async (member: ProjectMember, data: ProjectMemberInput) => {
    try {
      await notifyPromise(onUpsert({ ...member, ...data }), {
        loading: { title: 'Actualizando miembro…', description: data.displayName },
        success: { title: 'Miembro actualizado', description: data.displayName },
        error: (err) => errorMessage(err, 'No se pudo actualizar el miembro'),
      });
      setEditingId(null);
    } catch {
      // Toast de error ya mostrado por notifyPromise
    }
  };

  const handleDelete = async (member: ProjectMember) => {
    const confirmed = await confirm({
      title: `¿Eliminar a ${member.displayName}?`,
      description: 'Se quitará del equipo y dejará de estar asignado a historias.',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await notifyPromise(onDelete(member.id), {
        loading: { title: 'Eliminando miembro…', description: member.displayName },
        success: { title: 'Miembro eliminado', description: member.displayName },
        error: (err) => errorMessage(err, 'No se pudo eliminar el miembro'),
      });
    } catch {
      // Toast de error ya mostrado por notifyPromise
    }
  };

  const popover =
    open && mounted
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Gestionar equipo"
            className="fixed z-300 flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg animate-[fadeIn_0.15s_ease-out]"
            style={{
              top: position.top,
              left: position.left,
              width: POPOVER_WIDTH,
              maxHeight: position.maxHeight,
            }}
          >
            <header className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Equipo</h2>
                <span className="tabular-nums text-[11px] text-subtle">
                  {members.length}/{maxMembers}
                </span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-3">
              {members.length === 0 && !showForm ? (
                <p className="px-1 py-2 text-center text-xs text-muted">
                  Aún no hay miembros. Añade al equipo para asignar historias.
                </p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) =>
                    editingId === member.id ? (
                      <MemberForm
                        key={member.id}
                        initial={member}
                        compact
                        onSubmit={(data) => handleEdit(member, data)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div
                        key={member.id}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover"
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: member.avatarColor }}
                        >
                          {memberInitials(member.displayName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{member.displayName}</p>
                          <p className="text-[10px] text-subtle">{MEMBER_ROLE_LABELS[member.role]}</p>
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setShowForm(false);
                              setEditingId(member.id);
                            }}
                            className="cursor-pointer rounded-md p-1 text-subtle hover:bg-surface-hover hover:text-foreground"
                            aria-label={`Editar ${member.displayName}`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(member)}
                            className="cursor-pointer rounded-md p-1 text-subtle hover:bg-danger/10 hover:text-danger"
                            aria-label={`Eliminar ${member.displayName}`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {showForm ? (
                <div className="mt-2">
                  <MemberForm
                    compact
                    onSubmit={handleCreate}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              ) : null}
            </div>

            {!showForm && !editingId ? (
              <footer className="shrink-0 border-t border-border p-3">
                <button
                  type="button"
                  disabled={atLimit}
                  onClick={() => setShowForm(true)}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Añadir miembro
                </button>
              </footer>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-hover focus:border-border-strong focus:outline-none"
      >
        <span className="flex items-center">
          {visibleAvatars.length > 0 ? (
            <span className="flex -space-x-1.5">
              {visibleAvatars.map((member) => (
                <span
                  key={member.id}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface text-[9px] font-medium text-white"
                  style={{ backgroundColor: member.avatarColor }}
                  title={member.displayName}
                >
                  {memberInitials(member.displayName)}
                </span>
              ))}
              {overflow > 0 ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-surface-hover text-[9px] font-medium text-muted">
                  +{overflow}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-hover text-subtle">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </span>
          )}
        </span>
        <span className="hidden text-xs font-medium text-muted sm:inline">
          Equipo
          <span className="ml-1 text-subtle">
            ({members.length}/{maxMembers})
          </span>
        </span>
        <svg
          className={`h-3.5 w-3.5 text-subtle transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {popover}
    </>
  );
}
