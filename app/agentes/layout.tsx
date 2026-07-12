import { AgentThemeProvider } from '@/context/AgentThemeContext';
import { AgentThemeScript } from '@/components/agents/shared/theme/AgentThemeScript';
import { AgentAuthGuard } from '@/components/agents/shared/auth/AgentAuthGuard';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { WorkspaceSettingsProvider } from '@/context/WorkspaceSettingsContext';
import { AgentToaster } from '@/components/agents/shared/notifications/AgentToaster';
import { ConfirmDialogProvider } from '@/components/agents/shared/ConfirmDialog';

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
        <ConfirmDialogProvider>
          <WorkspaceSettingsProvider>
            <AgentAuthGuard>
              <WorkspaceProvider>{children}</WorkspaceProvider>
            </AgentAuthGuard>
          </WorkspaceSettingsProvider>
          <AgentToaster />
        </ConfirmDialogProvider>
      </AgentThemeProvider>
    </>
  );
}
