/**
 * @fileoverview Shell de /agentes: viewport completo y, solo en el dashboard,
 * el split-view de Klark.
 */

'use client';

import { usePathname } from 'next/navigation';
import { HarnessChatDock } from '@/components/agents/harness/HarnessChatDock';

export function AgentesShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showKlark =
    pathname === '/agentes/dashboard' || pathname.startsWith('/agentes/dashboard/');

  return (
    <div className="agentes-klark-shell">
      <div className="agentes-klark-shell__main">{children}</div>
      {showKlark ? <HarnessChatDock /> : null}
    </div>
  );
}
