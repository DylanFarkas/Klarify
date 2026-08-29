'use client';

import { DropdownSelect } from '@/components/ui/DropdownSelect';
import type { SprintOption } from '@/lib/utils/backlog-story-navigation';

interface StorySprintSelectProps {
  value: string | null;
  options: SprintOption[];
  disabled?: boolean;
  onChange: (sprintId: string | null) => void;
  storyId: string;
}

export function StorySprintSelect({
  value,
  options,
  disabled = false,
  onChange,
  storyId,
}: StorySprintSelectProps) {
  const dropdownOptions = [
    { value: '', label: 'Backlog' },
    ...options.map((opt) => ({ value: opt.id, label: opt.label })),
  ];

  return (
    <DropdownSelect
      value={value ?? ''}
      onChange={(next) => onChange(next ? next : null)}
      options={dropdownOptions}
      placeholder="Backlog"
      disabled={disabled}
      size="compact"
      className="w-full"
      aria-label={`Sprint de ${storyId}`}
    />
  );
}
