/**
 * @fileoverview Selector de categoría genérico para cualquier framework de priorización.
 */

'use client';

import type { PrioritizationFramework, FrameworkCategory } from '@/lib/types/agent-4';
import {
  getFrameworkCategories,
  getFrameworkLabels,
  getFrameworkColors,
} from '@/lib/constants/agent-4';

interface CategorySelectProps {
  framework: PrioritizationFramework;
  value: FrameworkCategory | '';
  onChange: (category: FrameworkCategory) => void;
  disabled?: boolean;
  className?: string;
}

export function CategorySelect({
  framework,
  value,
  onChange,
  disabled,
  className,
}: CategorySelectProps) {
  const categories = getFrameworkCategories(framework);
  const labels = getFrameworkLabels(framework);

  return (
    <select
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value as FrameworkCategory)}
      className={[
        'h-9 min-w-36 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40',
        className ?? 'w-44',
      ].join(' ')}
    >
      <option value="">---</option>
      {categories.map((cat) => (
        <option key={cat} value={cat}>
          {labels[cat]}
        </option>
      ))}
    </select>
  );
}

interface CategoryBadgeProps {
  framework: PrioritizationFramework;
  category: FrameworkCategory;
}

export function CategoryBadge({ framework, category }: CategoryBadgeProps) {
  const labels = getFrameworkLabels(framework);
  const colors = getFrameworkColors(framework);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors[category]}`}
    >
      {labels[category]}
    </span>
  );
}
