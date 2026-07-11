/**
 * @fileoverview Utilidades para descargar archivos exportados en el navegador.
 */

import type { ProjectExportFormat, ProjectExportPayload, ProjectExportResult } from '@/lib/export/types';
import { formatProjectAsJson } from '@/lib/export/format-json';
import { formatProjectAsMarkdown } from '@/lib/export/format-markdown';
import { formatProjectAsXlsx } from '@/lib/export/format-xlsx';

export async function buildProjectExport(
  payload: ProjectExportPayload,
  format: ProjectExportFormat
): Promise<ProjectExportResult> {
  switch (format) {
    case 'json':
      return formatProjectAsJson(payload);
    case 'markdown':
      return formatProjectAsMarkdown(payload);
    case 'xlsx':
      return formatProjectAsXlsx(payload);
  }
}

export function downloadProjectExport(result: ProjectExportResult): void {
  const blob =
    result.blob ??
    new Blob(['\uFEFF', result.content ?? ''], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
