'use client';

interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  className?: string;
}

export function SettingsToggle({
  checked,
  onChange,
  label,
  description,
  className,
}: SettingsToggleProps) {
  return (
    <div className={['flex items-center justify-between gap-6', className ?? 'px-4 py-3.5'].join(' ')}>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{description}</p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong',
          checked ? 'bg-success' : 'bg-border-strong',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ease-out',
            checked ? 'translate-x-4.5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}
