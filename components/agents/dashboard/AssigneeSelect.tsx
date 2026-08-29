'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { memberInitials } from '@/lib/board/board-utils';
import {
	MEMBER_ROLE_LABELS,
	type ProjectMember,
} from '@/lib/types/execution';

function AssigneeAvatar({
	member,
	size = 'md',
}: {
	member: ProjectMember | null;
	size?: 'sm' | 'md';
}) {
	const dim = size === 'sm' ? 'h-5 w-5 text-[8px]' : 'h-6 w-6 text-[9px]';
	if (member) {
		return (
			<span
				className={`flex shrink-0 items-center justify-center rounded-full font-medium text-white ${dim}`}
				style={{ backgroundColor: member.avatarColor }}
			>
				{memberInitials(member.displayName)}
			</span>
		);
	}
	return (
		<span
			className={`flex shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-muted font-bold text-muted ${dim}`}
		>
			?
		</span>
	);
}

interface AssigneeSelectProps {
	assignee: ProjectMember | null;
	members: ProjectMember[];
	onChange: (assigneeId: string | null) => void;
	disabled?: boolean;
	'aria-label'?: string;
	className?: string;
	variant?: 'icon' | 'row';
}

export function AssigneeSelect({
	assignee,
	members,
	onChange,
	disabled = false,
	'aria-label': ariaLabel,
	className = '',
	variant = 'icon',
}: AssigneeSelectProps) {
	const isRow = variant === 'row';
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [listStyle, setListStyle] = useState({ top: 0, left: 0, minWidth: 0 });
	const triggerRef = useRef<HTMLButtonElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const listboxId = useId();

	const updatePosition = useCallback(() => {
		const rect = triggerRef.current?.getBoundingClientRect();
		if (!rect) return;
		const minWidth = Math.max(rect.width, 200);
		const left = Math.min(
			Math.max(12, rect.left),
			window.innerWidth - 12 - minWidth
		);
		setListStyle({
			top: rect.bottom + 6,
			left,
			minWidth,
		});
	}, []);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open) return;
		updatePosition();

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) {
				return;
			}
			setOpen(false);
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.stopPropagation();
				setOpen(false);
			}
		};

		const handleReposition = () => updatePosition();

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleEscape, true);
		window.addEventListener('resize', handleReposition);
		window.addEventListener('scroll', handleReposition, true);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleEscape, true);
			window.removeEventListener('resize', handleReposition);
			window.removeEventListener('scroll', handleReposition, true);
		};
	}, [open, updatePosition]);

	const select = (assigneeId: string | null) => {
		onChange(assigneeId);
		setOpen(false);
	};

	const list =
		open && mounted
			? createPortal(
					<div
						ref={listRef}
						id={listboxId}
						role="listbox"
						className="fixed z-300 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-2xl animate-[fadeIn_0.15s_ease-out]"
						style={{
							top: listStyle.top,
							left: listStyle.left,
							minWidth: listStyle.minWidth,
						}}
					>
						<button
							type="button"
							role="option"
							aria-selected={!assignee}
							onClick={() => select(null)}
							className={[
								'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
								!assignee ? 'bg-surface-hover' : 'hover:bg-surface-hover/70',
							].join(' ')}
						>
							<AssigneeAvatar member={null} size="sm" />
							<span className="text-[12px] text-muted">Sin asignar</span>
						</button>
						{members.length === 0 ? (
							<p className="px-2 py-2 text-[11px] text-subtle">
								No hay miembros en el equipo.
							</p>
						) : (
							members.map((member) => {
								const isSelected = member.id === assignee?.id;
								return (
									<button
										key={member.id}
										type="button"
										role="option"
										aria-selected={isSelected}
										onClick={() => select(member.id)}
										className={[
											'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
											isSelected ? 'bg-surface-hover' : 'hover:bg-surface-hover/70',
										].join(' ')}
									>
										<AssigneeAvatar member={member} size="sm" />
										<span className="min-w-0 flex-1">
											<span className="block truncate text-[12px] font-medium text-foreground">
												{member.displayName}
											</span>
											<span className="block truncate text-[10px] text-subtle">
												{MEMBER_ROLE_LABELS[member.role]}
											</span>
										</span>
									</button>
								);
							})
						)}
					</div>,
					document.body
				)
			: null;

	return (
		<div className={className}>
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				aria-label={ariaLabel ?? (assignee ? `Asignado: ${assignee.displayName}` : 'Asignar responsable')}
				title={assignee ? assignee.displayName : 'Asignar responsable'}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? listboxId : undefined}
				onClick={() => {
					if (disabled) return;
					setOpen((current) => !current);
				}}
				className={[
					'inline-flex cursor-pointer items-center transition-colors',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong',
					'disabled:cursor-not-allowed disabled:opacity-50',
					isRow
						? [
								'h-8 w-full gap-2 rounded-md px-2 hover:bg-surface-hover',
								open ? 'bg-surface-hover' : '',
							].join(' ')
						: [
								'justify-center rounded-full',
								open ? 'ring-1 ring-border-strong/60' : 'hover:opacity-90',
							].join(' '),
				].join(' ')}
			>
				<AssigneeAvatar member={assignee} size={isRow ? 'sm' : 'md'} />
				{isRow ? (
					<span className="min-w-0 truncate text-sm text-foreground">
						{assignee?.displayName ?? 'Sin asignar'}
					</span>
				) : null}
			</button>
			{list}
		</div>
	);
}

export function AssigneeAvatarStatic({
	assignee,
}: {
	assignee: ProjectMember | null;
}) {
	return (
		<span title={assignee ? assignee.displayName : 'Sin asignar'}>
			<AssigneeAvatar member={assignee} />
		</span>
	);
}
