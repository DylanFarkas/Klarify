'use client';

import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import { SettingsToggle } from '@/components/agents/shared/settings/SettingsToggle';

export function GeneralSettingsPanel() {
  const { showModelReasoning, setShowModelReasoning } = useWorkspaceSettings();

  return (
    <div className="border-t border-border/60">
      <SettingsToggle
        checked={showModelReasoning}
        onChange={setShowModelReasoning}
        label="Mostrar razonamiento del modelo inteligente"
        description="Si lo desactivas, no verás el modal de actividad ni el razonamiento del modelo; solo un indicador de carga en la página."
        className="px-0 py-3"
      />
    </div>
  );
}
