'use client';

import { useMemo, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { buildProjectExport, downloadProjectExport } from '@/lib/export/download';
import { canExportProject, resolveProjectExport } from '@/lib/export/resolve-project-export';
import type { ProjectExportFormat } from '@/lib/export/types';

interface ProjectExportPanelProps {
  projectName: string;
  className?: string;
}

const EXPORT_FORMATS: Array<{
  id: ProjectExportFormat;
  label: string;
  description: string;
  extension: string;
}> = [
  {
    id: 'json',
    label: 'JSON',
    description: 'Estructura completa para integraciones y respaldo.',
    extension: '.json',
  },
  {
    id: 'markdown',
    label: 'Markdown',
    description: 'Documento legible con épicas, historias y sprints.',
    extension: '.md',
  },
  {
    id: 'csv',
    label: 'CSV',
    description: 'Tablas organizadas para Excel o Google Sheets.',
    extension: '.csv',
  },
];

export function ProjectExportPanel({ projectName, className = '' }: ProjectExportPanelProps) {
  const { workspace, plan } = useWorkspace();
  const [downloadingFormat, setDownloadingFormat] = useState<ProjectExportFormat | null>(null);

  const exportEnabled = plan?.limits.export !== false;
  const canExport = useMemo(
    () => Boolean(workspace && canExportProject(workspace)),
    [workspace]
  );

  if (!exportEnabled) {
    return null;
  }

  const handleExport = async (format: ProjectExportFormat) => {
    if (!workspace || !canExport) return;

    setDownloadingFormat(format);
    try {
      const payload = resolveProjectExport(workspace, projectName);
      const result = buildProjectExport(payload, format);
      downloadProjectExport(result);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <section
      className={`flex flex-col gap-4 rounded-2xl border border-border bg-surface/80 p-5 ${className}`}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">Exportar proyecto</p>
        <p className="mt-1 text-xs text-muted">
          Descarga épicas, historias, criterios de aceptación, estimaciones, prioridades, sprints y
          estado del tablero en el formato que prefieras.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {EXPORT_FORMATS.map((format) => {
          const isLoading = downloadingFormat === format.id;

          return (
            <button
              key={format.id}
              type="button"
              onClick={() => handleExport(format.id)}
              disabled={!canExport || downloadingFormat !== null}
              className="cursor-pointer flex flex-col items-start gap-2 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              title={
                canExport
                  ? `Descargar ${format.label}`
                  : 'Genera al menos un backlog antes de exportar'
              }
            >
              <span className="text-sm font-semibold text-foreground">
                {isLoading ? 'Descargando…' : format.label}
                <span className="ml-1.5 font-normal text-muted">{format.extension}</span>
              </span>
              <span className="text-xs leading-relaxed text-muted">{format.description}</span>
            </button>
          );
        })}
      </div>

      {!canExport ? (
        <p className="text-xs text-muted">
          Completa al menos el Agente 2 (backlog) para habilitar la exportación.
        </p>
      ) : null}
    </section>
  );
}
