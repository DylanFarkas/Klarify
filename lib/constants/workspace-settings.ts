/** Clave de localStorage para preferencias generales del workspace */
export const STORAGE_KEY_WORKSPACE_SETTINGS = 'klarify-workspace-settings';

export interface WorkspaceGeneralSettings {
  /** Muestra el razonamiento del modelo inteligente mientras procesa */
  showModelReasoning: boolean;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceGeneralSettings = {
  showModelReasoning: true,
};

export function readPersistedWorkspaceSettings(): WorkspaceGeneralSettings {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_SETTINGS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORKSPACE_SETTINGS);
    if (!raw) return DEFAULT_WORKSPACE_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<WorkspaceGeneralSettings>;
    return {
      showModelReasoning:
        typeof parsed.showModelReasoning === 'boolean'
          ? parsed.showModelReasoning
          : DEFAULT_WORKSPACE_SETTINGS.showModelReasoning,
    };
  } catch {
    return DEFAULT_WORKSPACE_SETTINGS;
  }
}
