'use client';

import { useState } from 'react';
import { useAgentTheme } from '@/context/AgentThemeContext';
import type { AgentTheme } from '@/lib/constants/agent-theme';

const THEME_OPTIONS: { value: AgentTheme; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

export function AgentSidebarSettings() {
  const { theme, setTheme } = useAgentTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-8 border-t border-slate-200 pt-6 dark:border-white/10">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="agent-sidebar-settings-panel"
        className={[
          'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium',
          'text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900',
          'dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-white',
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
          className="mt-2 space-y-3 rounded-lg bg-slate-50 px-3 py-3 dark:bg-white/[0.04]"
        >
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/40">
            Tema
          </p>
          <div className="flex flex-col gap-1" role="radiogroup" aria-label="Tema">
            {THEME_OPTIONS.map((option) => {
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setTheme(option.value)}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-[#005BBF]/10 text-[#005BBF] dark:bg-[#005BBF]/20 dark:text-[#4d9fff]'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/[0.06]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                      isSelected
                        ? 'border-[#005BBF] dark:border-[#4d9fff]'
                        : 'border-slate-300 dark:border-white/30',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-[#005BBF] dark:bg-[#4d9fff]" />
                    )}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
