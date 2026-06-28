import { AgentThemeProvider } from '@/context/AgentThemeContext';
import { AgentThemeScript } from '@/components/agents/shared/AgentThemeScript';
import { AgentAuthGuard } from '@/components/agents/shared/AgentAuthGuard';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { WorkspaceSettingsProvider } from '@/context/WorkspaceSettingsContext';

/** Layout compartido de /agentes — exige sesión, workspace y temas */
export default function AgentesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AgentThemeScript />
      <AgentThemeProvider>
        <WorkspaceSettingsProvider>
          <AgentAuthGuard>
            <WorkspaceProvider>{children}</WorkspaceProvider>
          </AgentAuthGuard>
        </WorkspaceSettingsProvider>
      </AgentThemeProvider>
    </>
  );
}
