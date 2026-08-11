'use client';

import { useAgentTheme } from '@/context/AgentThemeContext';
import {
  AGENT_THEMES,
  KLARIFY_ACCENTS,
  getKlarifyAccentMeta,
} from '@/lib/constants/agent-theme';

export function ThemeSettingsPanel() {
  const { theme, setTheme, klarifyAccent, setKlarifyAccent } = useAgentTheme();
  const activeKlarifyAccent = getKlarifyAccentMeta(klarifyAccent);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2.5 text-[13px] font-medium text-foreground">Tema del workspace</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Tema del workspace">
        {AGENT_THEMES.map((option) => {
          const isSelected = theme === option.id;
          const previewAccent =
            option.id === 'klarify' ? activeKlarifyAccent.primary : option.preview.accent;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(option.id)}
              className={[
                'group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border text-left transition-colors',
                isSelected
                  ? 'border-border-strong'
                  : 'border-border hover:border-border-strong',
              ].join(' ')}
            >
              <div
                className="relative h-14 w-full"
                style={{ backgroundColor: option.preview.bg }}
                aria-hidden="true"
              >
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: previewAccent }}
                />
                <div
                  className="absolute left-3 top-3 h-1.5 w-7 rounded-full opacity-40"
                  style={{ backgroundColor: previewAccent }}
                />
                <div
                  className="absolute left-3 top-6 h-1 w-10 rounded-full opacity-25"
                  style={{ backgroundColor: previewAccent }}
                />
                {isSelected && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="border-t border-border bg-surface px-3 py-2">
                <span
                  className={[
                    'text-xs font-medium',
                    isSelected ? 'text-foreground' : 'text-muted',
                  ].join(' ')}
                >
                  {option.label}
                </span>
              </div>
            </button>
          );
        })}
        </div>
      </div>

      {theme === 'klarify' && (
        <div className="rounded-lg border border-border px-4 py-3.5">
          <div className="mb-3">
            <p className="text-[13px] font-medium text-foreground">Acento</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Combina la base oscura de Klarify con el color que prefieras.
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Acento de Klarify"
          >
            {KLARIFY_ACCENTS.map((accent) => {
              const isSelected = klarifyAccent === accent.id;
              return (
                <button
                  key={accent.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={accent.label}
                  title={accent.label}
                  onClick={() => setKlarifyAccent(accent.id)}
                  className={[
                    'relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-opacity',
                    isSelected
                      ? 'ring-2 ring-border-strong ring-offset-2 ring-offset-surface'
                      : 'hover:opacity-90',
                  ].join(' ')}
                  style={{ backgroundColor: accent.primary }}
                >
                  {isSelected && (
                    <svg
                      className="h-3.5 w-3.5 text-white"
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
