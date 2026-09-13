import { AgentThemeProvider } from '@/context/AgentThemeContext';
import { AgentAuthGuard } from '@/components/agents/shared/auth/AgentAuthGuard';
import { AiProviderProvider } from '@/context/AiProviderContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { WorkspaceSettingsProvider } from '@/context/WorkspaceSettingsContext';
import { SettingsModalHost } from '@/components/agents/shared/settings/SettingsModalHost';
import { AgentToaster } from '@/components/agents/shared/notifications/AgentToaster';
import { ConfirmDialogProvider } from '@/components/agents/shared/ConfirmDialog';
import { AgentesShell } from '@/components/agents/harness/AgentesShell';
import { SidebarCollapsedProvider } from '@/context/SidebarCollapsedContext';

/** Layout compartido de /agentes — exige sesión, workspace y temas */
export default function AgentesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AgentThemeProvider>
      <ConfirmDialogProvider>
        <WorkspaceSettingsProvider>
          <AgentAuthGuard>
            <AiProviderProvider>
              <WorkspaceProvider>
                <SidebarCollapsedProvider>
                  <SettingsModalHost>
                    <AgentesShell>{children}</AgentesShell>
                  </SettingsModalHost>
                </SidebarCollapsedProvider>
              </WorkspaceProvider>
            </AiProviderProvider>
          </AgentAuthGuard>
        </WorkspaceSettingsProvider>
        <AgentToaster />
      </ConfirmDialogProvider>
    </AgentThemeProvider>
  );
}
