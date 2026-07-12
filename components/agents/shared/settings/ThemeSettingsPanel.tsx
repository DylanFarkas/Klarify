'use client';

import { useAgentTheme } from '@/context/AgentThemeContext';
import {
  AGENT_THEMES,
  CARBON_ACCENTS,
  getCarbonAccentMeta,
} from '@/lib/constants/agent-theme';

export function ThemeSettingsPanel() {
  const { theme, setTheme, carbonAccent, setCarbonAccent } = useAgentTheme();
  const activeCarbonAccent = getCarbonAccentMeta(carbonAccent);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Tema del workspace</h3>
        <p className="mt-1 text-xs text-subtle">
          Elige la apariencia que prefieras para trabajar con tus agentes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Tema del workspace">
        {AGENT_THEMES.map((option) => {
          const isSelected = theme === option.id;
          const previewAccent =
            option.id === 'carbon' ? activeCarbonAccent.primary : option.preview.accent;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(option.id)}
              className={[
                'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-all',
                isSelected
                  ? 'border-primary ring-2 ring-primary/30 shadow-sm'
                  : 'border-border hover:border-border-strong hover:shadow-sm',
              ].join(' ')}
            >
              <div
                className="relative h-16 w-full"
                style={{ backgroundColor: option.preview.bg }}
                aria-hidden="true"
              >
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: previewAccent }}
                />
                <div
                  className="absolute left-3 top-3 h-2 w-8 rounded-full opacity-40"
                  style={{ backgroundColor: previewAccent }}
                />
                <div
                  className="absolute left-3 top-7 h-1.5 w-12 rounded-full opacity-25"
                  style={{ backgroundColor: previewAccent }}
                />
                {isSelected && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="border-t border-border/60 bg-surface px-3 py-2.5">
                <span
                  className={[
                    'text-xs font-semibold',
                    isSelected ? 'text-primary' : 'text-foreground',
                  ].join(' ')}
                >
                  {option.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {theme === 'carbon' && (
        <div className="rounded-xl border border-border bg-surface-muted/40 px-3 py-3">
          <div className="mb-2.5">
            <p className="text-xs font-semibold text-foreground">Acento</p>
            <p className="mt-0.5 text-[11px] text-subtle">
              Combina la base oscura de Carbón con el color que prefieras.
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Acento de Carbón"
          >
            {CARBON_ACCENTS.map((accent) => {
              const isSelected = carbonAccent === accent.id;
              return (
                <button
                  key={accent.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={accent.label}
                  title={accent.label}
                  onClick={() => setCarbonAccent(accent.id)}
                  className={[
                    'cursor-pointer relative flex h-8 w-8 items-center justify-center rounded-full transition-all',
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'hover:scale-105',
                  ].join(' ')}
                  style={{ backgroundColor: accent.primary }}
                >
                  {isSelected && (
                    <svg
                      className="h-3.5 w-3.5 text-white drop-shadow-sm"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
