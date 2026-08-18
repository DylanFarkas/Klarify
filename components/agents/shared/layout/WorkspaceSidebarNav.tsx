'use client';

/**
 * @fileoverview Navegación del workspace una vez cerrado el pipeline.
 *
 * Sustituye el stepper de agentes: las etapas 1–4 ya no se editan y no
 * merecen una lista permanente. Aquí solo viven las vistas de trabajo.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkspace } from '@/hooks/useWorkspace';

const DESTINATIONS = [
  {
    href: '/agentes/dashboard',
    label: 'Dashboard',
    description: 'Backlog, sprints y seguimiento del proyecto.',
    requiresBoard: false,
    icon: (
      <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
        />
      </svg>
    ),
  },
  {
    href: '/agentes/board',
    label: 'Tablero',
    description: 'Kanban de ejecución y equipo del sprint.',
    requiresBoard: true,
    icon: (
      <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 4.5v15m6-15v15M4.5 9.75h15M4.5 14.25h15"
        />
      </svg>
    ),
  },
] as const;

export function WorkspaceSidebarNav() {
  const pathname = usePathname();
  const { plan } = useWorkspace();
  const boardEnabled = plan?.limits.executionBoard ?? false;

  const items = DESTINATIONS.filter((item) => !item.requiresBoard || boardEnabled || pathname === item.href);

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Vistas del proyecto">
      <p className="mb-2 px-2.5 text-xs font-medium text-subtle">Workspace</p>

      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2.5 rounded-lg px-2.5 py-2 transition-colors',
              isActive
                ? 'bg-surface-hover text-foreground'
                : 'text-muted hover:bg-surface-hover hover:text-foreground',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={isActive ? 'text-primary' : 'text-current'}>{item.icon}</span>
            <span className={['truncate text-sm leading-5', isActive ? 'font-medium' : ''].join(' ')}>
              {item.label}
            </span>
            {isActive ? (
              <span className="col-start-2 text-xs leading-snug text-subtle">{item.description}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
