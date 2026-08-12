'use client';

import { useEffect, useState } from 'react';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import type { Epic } from '@/lib/types/agent-2';
import { errorMessage, notifyError, notifySuccess } from '@/lib/notifications/toast';

const fieldLabelClass = 'text-[12px] font-medium text-muted';
const fieldControlClass =
	'mt-1.5 w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong';

interface DashboardEpicManagerProps {
	open: boolean;
	onClose: () => void;
	epics: Epic[];
	initialEpicId?: string | null;
	onCreate: (input: { title: string; description: string }) => Promise<void>;
	onUpdate: (epicId: string, updates: { title?: string; description?: string }) => Promise<void>;
	onDelete: (epicId: string) => Promise<void>;
}

export function DashboardEpicManager({
	open,
	onClose,
	epics,
	initialEpicId = null,
	onCreate,
	onUpdate,
	onDelete,
}: DashboardEpicManagerProps) {
	const confirm = useConfirm();
	const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		if (initialEpicId) {
			const epic = epics.find((item) => item.id === initialEpicId);
			if (epic) {
				setMode('edit');
				setEditingId(epic.id);
				setTitle(epic.title);
				setDescription(epic.description);
				setIsSaving(false);
				return;
			}
		}
		setMode('list');
		setEditingId(null);
		setTitle('');
		setDescription('');
		setIsSaving(false);
		// Solo al abrir o al elegir otra épica; no resetear mientras se escribe.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, initialEpicId]);

	const isSaveDisabled = !title.trim() || !description.trim() || isSaving;
	const editingEpic = editingId ? epics.find((epic) => epic.id === editingId) : null;

	const resetForm = () => {
		setMode('list');
		setEditingId(null);
		setTitle('');
		setDescription('');
	};

	const startCreate = () => {
		setMode('create');
		setEditingId(null);
		setTitle('');
		setDescription('');
	};

	const startEdit = (epic: Epic) => {
		setMode('edit');
		setEditingId(epic.id);
		setTitle(epic.title);
		setDescription(epic.description);
	};

	const handleSave = async () => {
		if (isSaveDisabled) return;
		setIsSaving(true);
		try {
			if (mode === 'create') {
				await onCreate({ title: title.trim(), description: description.trim() });
				notifySuccess('Épica creada');
			} else if (editingId) {
				await onUpdate(editingId, { title: title.trim(), description: description.trim() });
				notifySuccess('Épica actualizada');
			}
			resetForm();
		} catch (err) {
			notifyError(errorMessage(err, mode === 'create' ? 'No se pudo crear la épica' : 'No se pudo guardar la épica'));
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (epic: Epic) => {
		const storyCount = epic.userStories.length;
		const confirmed = await confirm({
			title: `¿Eliminar la épica "${epic.title}"?`,
			description:
				storyCount > 0
					? `Se eliminarán también sus ${storyCount} historia${storyCount !== 1 ? 's' : ''}. Esta acción no se puede deshacer.`
					: 'Esta acción no se puede deshacer.',
			confirmLabel: 'Eliminar',
			variant: 'danger',
		});
		if (!confirmed) return;
		try {
			await onDelete(epic.id);
			notifySuccess(`${epic.id} eliminada`);
			if (editingId === epic.id) resetForm();
		} catch (err) {
			notifyError(errorMessage(err, 'No se pudo eliminar la épica'));
		}
	};

	return (
		<DetailModal
			open={open}
			onClose={onClose}
			eyebrow="Dashboard"
			title="Épicas"
			subtitle={`${epics.length} en el backlog`}
			maxWidth="lg"
		>
			<p className="mb-4 text-[13px] text-muted">
				Crea, edita o elimina épicas. Las historias nuevas se asignan a una de ellas.
			</p>

			{mode === 'list' ? (
				<div className="mb-3 flex justify-end">
					<button
						type="button"
						onClick={startCreate}
						className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
						</svg>
						Nueva épica
					</button>
				</div>
			) : (
				<div className="mb-4 rounded-xl border border-border bg-surface-muted/40 p-3.5">
					<p className="text-[12px] font-medium text-foreground">
						{mode === 'create' ? 'Nueva épica' : `Editar ${editingEpic?.id ?? ''}`}
					</p>
					<label className="mt-3 block">
						<span className={fieldLabelClass}>Título</span>
						<input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="Gestión visual de proyectos"
							className={fieldControlClass}
						/>
					</label>
					<label className="mt-3 block">
						<span className={fieldLabelClass}>Descripción</span>
						<textarea
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							rows={3}
							placeholder="Qué cubre esta épica y por qué existe."
							className={`${fieldControlClass} resize-y`}
						/>
					</label>
					<div className="mt-3 flex justify-end gap-2">
						<button
							type="button"
							onClick={resetForm}
							className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
						>
							Cancelar
						</button>
						<button
							type="button"
							disabled={isSaveDisabled}
							onClick={() => void handleSave()}
							className={[
								'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-opacity',
								isSaveDisabled
									? 'cursor-not-allowed bg-disabled text-disabled-text opacity-40'
									: 'cursor-pointer bg-foreground text-background hover:opacity-90',
							].join(' ')}
						>
							{mode === 'create' ? 'Crear' : 'Guardar'}
						</button>
					</div>
				</div>
			)}

			{epics.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
					<p className="text-sm font-medium text-foreground">Aún no hay épicas</p>
					<p className="mt-1 text-[13px] text-muted">Crea una para poder agrupar historias.</p>
				</div>
			) : (
				<ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
					{epics.map((epic) => (
						<li key={epic.id} className="flex items-start gap-3 px-3.5 py-3">
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-mono text-[11px] font-bold text-muted">{epic.id}</span>
									<p className="truncate text-sm font-semibold text-foreground">{epic.title}</p>
								</div>
								<p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
									{epic.description}
								</p>
							</div>
							<span className="mt-0.5 shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted">
								{epic.userStories.length} HU
							</span>
							<div className="mt-0.5 flex shrink-0 gap-0.5">
								<button
									type="button"
									onClick={() => startEdit(epic)}
									className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
									title="Editar épica"
									aria-label={`Editar ${epic.title}`}
								>
									<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"
										/>
									</svg>
								</button>
								<button
									type="button"
									onClick={() => void handleDelete(epic)}
									className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-danger"
									title="Eliminar épica"
									aria-label={`Eliminar ${epic.title}`}
								>
									<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
										/>
									</svg>
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</DetailModal>
	);
}
