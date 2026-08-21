/**
 * @fileoverview Shell de /agentes: viewport completo y, solo en el dashboard,
 * el split-view de Klark.
 */

'use client';

import { usePathname } from 'next/navigation';
import { HarnessChatDock } from '@/components/agents/harness/HarnessChatDock';
import { KlarkControlProvider } from '@/context/KlarkControlContext';

export function AgentesShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showKlark =
    pathname === '/agentes/dashboard' ||
    pathname.startsWith('/agentes/dashboard/') ||
    pathname === '/agentes/backlog' ||
    pathname.startsWith('/agentes/backlog/') ||
    pathname === '/agentes/stack' ||
    pathname.startsWith('/agentes/stack/');

  return (
    <KlarkControlProvider>
      <div className="agentes-klark-shell">
        <div className="agentes-klark-shell__main">{children}</div>
        {showKlark ? <HarnessChatDock /> : null}
      </div>
    </KlarkControlProvider>
  );
}
