'use client';

import Link from 'next/link';

interface WorkspaceSidebarChromeProps {
  brandSubtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/**
 * Marco compartido del sidebar: tarjeta flotante con borde y radio,
 * inset respecto al fondo del workspace (estilo bordeado).
 */
export function WorkspaceSidebarChrome({
  brandSubtitle,
  children,
  footer,
}: WorkspaceSidebarChromeProps) {
  return (
    <aside className="relative z-10 my-3 ml-3 hidden w-64 shrink-0 flex-col overflow-hidden rounded-2xl bg-surface lg:flex border border-border">
      <div className="flex min-h-0 flex-1 flex-col px-3.5 pt-5">
        <div className="mb-5">
          <Link
            href="/agentes/proyectos"
            className="block text-center text-3xl font-extrabold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            <span className="text-primary">K</span>larify
          </Link>
          <p className="mt-1.5 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
            {brandSubtitle}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-gutter-stable">{children}</div>
      </div>

      <div className="mt-auto shrink-0 border-t border-border px-3.5 py-3.5">{footer}</div>
    </aside>
  );
}
