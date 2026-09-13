'use client';

/**
 * @fileoverview Enlace para salir del workspace de agentes y volver al hub de proyectos.
 */

import Link from 'next/link';
import {
  SIDEBAR_ICON_CLASS,
  sidebarIconSlotClass,
  sidebarLabelClass,
  sidebarNavItemClass,
} from './sidebar-styles';

interface NewSessionButtonProps {
  className?: string;
}

export function NewSessionButton({ className = '' }: NewSessionButtonProps) {
  return (
    <Link
      href="/agentes/proyectos"
      title="Salir del workspace"
      className={[sidebarNavItemClass(false), className].filter(Boolean).join(' ')}
    >
      <span className={sidebarIconSlotClass}>
        <svg
          className={SIDEBAR_ICON_CLASS}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
          />
        </svg>
      </span>
      <span className={sidebarLabelClass}>Salir del workspace</span>
    </Link>
  );
}
