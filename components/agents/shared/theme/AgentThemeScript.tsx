/**
 * @fileoverview AgentThemeScript — Script anti-FOUC para temas de agentes.
 *
 * Usa next/script con beforeInteractive para ejecutarse en la carga inicial
 * sin provocar el warning de React 19 sobre <script> en componentes cliente.
 */

import Script from 'next/script';
import { getAgentThemeBootstrapScript } from '@/lib/constants/agent-theme';

export function AgentThemeScript() {
  return (
    <Script
      id="klarify-agent-theme"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: getAgentThemeBootstrapScript() }}
    />
  );
}
