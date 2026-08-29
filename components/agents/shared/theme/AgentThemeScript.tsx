/**
 * @fileoverview AgentThemeScript — Script anti-FOUC para temas de agentes.
 *
 * Debe vivir en el layout raíz (`app/layout.tsx`), dentro de `<head>`: un
 * script clásico bloqueante corre antes del primer paint. `next/script` con
 * `beforeInteractive` no aplica a tiempo si se monta en un layout anidado.
 */

import { getAgentThemeBootstrapScript } from '@/lib/constants/agent-theme';

export function AgentThemeScript() {
  return (
    <script
      id="klarify-agent-theme"
      dangerouslySetInnerHTML={{ __html: getAgentThemeBootstrapScript() }}
    />
  );
}
