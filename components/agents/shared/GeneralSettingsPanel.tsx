'use client';

import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import { SettingsToggle } from '@/components/agents/shared/SettingsToggle';

export function GeneralSettingsPanel() {
  const { showModelReasoning, setShowModelReasoning } = useWorkspaceSettings();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Configuraciones generales</h3>
        <p className="mt-1 text-xs text-subtle">
          Ajusta el comportamiento del workspace mientras los agentes procesan tu solicitud.
        </p>
      </div>

      <SettingsToggle
        checked={showModelReasoning}
        onChange={setShowModelReasoning}
        label="Mostrar razonamiento del modelo inteligente"
        description="Si lo desactivas, no verás el modal de actividad ni el razonamiento del modelo; solo un indicador de carga en la página."
      />
    </div>
  );
}
