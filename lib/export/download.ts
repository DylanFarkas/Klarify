/**
 * @fileoverview Utilidades para descargar archivos exportados en el navegador.
 */

import type { ProjectExportFormat, ProjectExportPayload, ProjectExportResult } from '@/lib/export/types';
import { formatProjectAsCsv } from '@/lib/export/format-csv';
import { formatProjectAsJson } from '@/lib/export/format-json';
import { formatProjectAsMarkdown } from '@/lib/export/format-markdown';

export function buildProjectExport(
  payload: ProjectExportPayload,
  format: ProjectExportFormat
): ProjectExportResult {
  switch (format) {
    case 'json':
      return formatProjectAsJson(payload);
    case 'markdown':
      return formatProjectAsMarkdown(payload);
    case 'csv':
      return formatProjectAsCsv(payload);
  }
}

export function downloadProjectExport(result: ProjectExportResult): void {
  const blob = new Blob(['\uFEFF', result.content], { type: result.mimeType });
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
