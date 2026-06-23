'use client';

/**
 * @fileoverview AgentSidebarSettings — Panel de configuración del sidebar.
 *
 * Permite al usuario elegir entre los temas predeterminados del workspace.
 * Se renderiza en el sidebar (desktop) y en la barra superior (móvil).
 */

import { useState } from 'react';
import { useAgentTheme } from '@/context/AgentThemeContext';
import { AGENT_THEMES } from '@/lib/constants/agent-theme';

interface AgentSidebarSettingsProps {
  /** Clases extra para adaptar el componente en distintos layouts (ej. móvil) */
  className?: string;
}

export function AgentSidebarSettings({ className = '' }: AgentSidebarSettingsProps) {
  const { theme, setTheme } = useAgentTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={['relative z-10 mt-8 border-t border-border pt-6', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="agent-sidebar-settings-panel"
        className={[
          'flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium',
          'text-muted transition-colors hover:bg-surface-hover hover:text-foreground',
        ].join(' ')}
      >
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="flex-1 text-left">Configuración</span>
        <svg
          className={[
            'h-4 w-4 shrink-0 transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          id="agent-sidebar-settings-panel"
          className="relative z-10 mt-2 space-y-3 rounded-lg bg-elevated px-3 py-3"
        >
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-subtle">
            Tema
          </p>
          {/* Lista de presets disponibles */}
          <div className="flex max-h-52 flex-col gap-1 overflow-y-auto" role="radiogroup" aria-label="Tema">
            {AGENT_THEMES.map((option) => {
              const isSelected = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTheme(option.id);
                  }}
                  className={[
                    'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'text-muted hover:bg-surface-hover hover:text-foreground',
                  ].join(' ')}
                >
                  <span
                    className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong"
                    style={{ backgroundColor: option.preview.bg }}
                    aria-hidden="true"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: option.preview.accent }}
                    />
                  </span>
                  <span className="flex-1">{option.label}</span>
                  {isSelected && (
                    <svg
                      className="h-4 w-4 shrink-0 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
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
