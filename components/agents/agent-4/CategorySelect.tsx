/**
 * @fileoverview Selector de categoría genérico para cualquier framework de priorización.
 */

'use client';

import type { PrioritizationFramework, FrameworkCategory } from '@/lib/types/agent-4';
import {
  getFrameworkCategories,
  getFrameworkLabels,
  getFrameworkShortLabels,
} from '@/lib/constants/agent-4';
import { DropdownSelect } from '@/components/ui/DropdownSelect';

interface CategorySelectProps {
  framework: PrioritizationFramework;
  value: FrameworkCategory | '';
  onChange: (category: FrameworkCategory) => void;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'compact';
  variant?: 'default' | 'ghost';
}

export function CategorySelect({
  framework,
  value,
  onChange,
  disabled,
  className,
  size,
  variant,
}: CategorySelectProps) {
  const categories = getFrameworkCategories(framework);
  const labels = getFrameworkLabels(framework);

  return (
    <DropdownSelect
      value={value}
      onChange={(next) => onChange(next as FrameworkCategory)}
      options={categories.map((cat) => ({
        value: cat,
        label: labels[cat] ?? cat,
      }))}
      placeholder="—"
      disabled={disabled}
      className={className ?? 'w-44'}
      size={size}
      variant={variant}
    />
  );
}

interface CategoryBadgeProps {
  framework: PrioritizationFramework;
  category: FrameworkCategory;
}

export function CategoryBadge({ framework, category }: CategoryBadgeProps) {
  const labels = getFrameworkShortLabels(framework);

  return (
    <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
      {labels[category] ?? category}
    </span>
  );
}
