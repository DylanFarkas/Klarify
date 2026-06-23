import { AgentThemeProvider } from '@/context/AgentThemeContext';
import { AgentThemeScript } from '@/components/agents/shared/AgentThemeScript';

/** Layout compartido de /agentes — envuelve todas las rutas de agentes con el provider de temas */
export default function AgentesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AgentThemeScript />
      <AgentThemeProvider>{children}</AgentThemeProvider>
    </>
  );
}
