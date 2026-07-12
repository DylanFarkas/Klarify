/**
 * @fileoverview Selector de categoría MoSCoW reutilizable.
 */

'use client';

import type { MoscowCategory } from '@/lib/types/agent-4';
import {
  MOSCOW_CATEGORIES,
  MOSCOW_LABELS,
  MOSCOW_COLORS,
} from '@/lib/constants/agent-4';

interface MoscowCategorySelectProps {
  value: MoscowCategory | '';
  onChange: (category: MoscowCategory) => void;
  disabled?: boolean;
}

export function MoscowCategorySelect({
  value,
  onChange,
  disabled,
}: MoscowCategorySelectProps) {
  return (
    <select
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value as MoscowCategory)}
      className="h-9 w-44 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
    >
      <option value="">---</option>
      {MOSCOW_CATEGORIES.map((cat) => (
        <option key={cat} value={cat}>
          {MOSCOW_LABELS[cat]}
        </option>
      ))}
    </select>
  );
}

interface MoscowCategoryBadgeProps {
  category: MoscowCategory;
}

export function MoscowCategoryBadge({ category }: MoscowCategoryBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${MOSCOW_COLORS[category]}`}
    >
      {MOSCOW_LABELS[category]}
    </span>
  );
}
