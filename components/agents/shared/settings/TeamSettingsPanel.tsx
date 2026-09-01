'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import { MemberFormModal } from '@/components/agents/shared/settings/MemberFormModal';
import { memberInitials } from '@/lib/board/board-utils';
import { errorMessage, notifyPromise } from '@/lib/notifications/toast';
import { MEMBER_ROLE_LABELS, type ProjectMember, type ProjectMemberInput } from '@/lib/types/execution';

export function TeamSettingsPanel() {
  const { workspace, plan, projects, activeProjectId, upsertMember, deleteMember } = useWorkspace();
  const confirm = useConfirm();
  const [dialogMember, setDialogMember] = useState<ProjectMember | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );
  const members = workspace?.execution?.members ?? [];
  const maxMembers = plan?.limits.maxTeamMembers ?? 0;
  const executionBoardEnabled = plan?.limits.executionBoard ?? false;
  const hasPipeline = Boolean(workspace?.pipeline.agent6Input);
  const atLimit = members.length >= maxMembers;

  const openCreate = () => {
    setDialogMember(null);
    setDialogOpen(true);
  };

  const openEdit = (member: ProjectMember) => {
    setDialogMember(member);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogMember(null);
  };

  const handleSubmit = async (data: ProjectMemberInput) => {
    const isEdit = Boolean(dialogMember);
    const persist = upsertMember(dialogMember ? { ...dialogMember, ...data } : data);
    closeDialog();
    try {
      await notifyPromise(
        persist,
        isEdit
          ? {
              loading: { title: 'Actualizando persona…', description: data.displayName },
              success: { title: 'Persona actualizada', description: data.displayName },
              error: (err) => errorMessage(err, 'No se pudo actualizar la persona'),
            }
          : {
              loading: { title: 'Añadiendo persona…', description: data.displayName },
              success: { title: 'Persona añadida', description: data.displayName },
              error: (err) => errorMessage(err, 'No se pudo añadir la persona'),
            }
      );
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
      await notifyPromise(deleteMember(member.id), {
        loading: { title: 'Eliminando persona…', description: member.displayName },
        success: { title: 'Persona eliminada', description: member.displayName },
        error: (err) => errorMessage(err, 'No se pudo eliminar la persona'),
      });
    } catch {
      // Toast de error ya mostrado por notifyPromise
    }
  };

  if (!executionBoardEnabled) {
    return (
      <div>
        <p className="text-[13px] leading-relaxed text-muted">
          Añade personas, asígnalas a historias y prepárate para invitarlas al proyecto. Disponible en
          los planes Starter y Pro.
        </p>
        <Link
          href="/#pricing"
          className="mt-3 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Ver planes
        </Link>
      </div>
    );
  }

  if (!activeProjectId || !activeProject) {
    return (
      <p className="text-[13px] leading-relaxed text-muted">
        Selecciona un proyecto para gestionar su equipo.
      </p>
    );
  }

  if (!hasPipeline) {
    return (
      <div>
        <p className="text-[13px] font-medium text-foreground">{activeProject.name}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Termina el pipeline de este proyecto para añadir personas y asignarlas a historias.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-medium text-foreground">{activeProject.name}</p>
        <span className="shrink-0 text-[12px] tabular-nums text-subtle">
          {members.length}/{maxMembers}
        </span>
      </div>
      <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
        Por ahora no reciben acceso a Klarify: sirven para asignar historias.
      </p>

      {members.length === 0 ? (
        <div className="mt-8 flex flex-col items-center py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted text-muted">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          </div>
          <h4 className="mt-4 text-[15px] font-semibold tracking-tight text-foreground">Aún no hay personas</h4>
          <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
            Añade al equipo para asignar historias del tablero.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex cursor-pointer rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Añadir persona
          </button>
        </div>
      ) : (
        <>
          <ul className="mt-4">
            {members.map((member) => (
              <li
                key={member.id}
                className="group flex items-center gap-2.5 border-t border-border/60 py-2.5 hover:bg-surface-hover/30"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {memberInitials(member.displayName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{member.displayName}</p>
                  <p className="truncate text-[12px] text-subtle">
                    {MEMBER_ROLE_LABELS[member.role]}
                    {member.email ? ` · ${member.email}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(member)}
                    className="cursor-pointer rounded-md p-1.5 text-subtle hover:bg-surface-muted hover:text-foreground"
                    aria-label={`Editar ${member.displayName}`}
                    title="Editar"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(member)}
                    className="cursor-pointer rounded-md p-1.5 text-subtle hover:text-danger"
                    aria-label={`Eliminar ${member.displayName}`}
                    title="Eliminar"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {atLimit ? (
            <p className="mt-3 text-[12px] text-subtle">Has alcanzado el límite de miembros de tu plan.</p>
          ) : (
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 cursor-pointer text-[12px] font-medium text-muted transition-colors hover:text-foreground"
            >
              Añadir persona
            </button>
          )}
        </>
      )}

      <MemberFormModal
        open={dialogOpen}
        member={dialogMember}
        onClose={closeDialog}
        onSubmit={(data) => void handleSubmit(data)}
      />
    </div>
  );
}
