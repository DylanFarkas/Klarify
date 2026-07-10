import { describe, expect, it } from 'vitest';
import { formatProjectAsJson } from '@/lib/export/format-json';
import { formatProjectAsMarkdown } from '@/lib/export/format-markdown';
import { formatProjectAsCsv } from '@/lib/export/format-csv';
import { buildProjectExport } from '@/lib/export/download';
import { canExportProject, resolveProjectExport } from '@/lib/export/resolve-project-export';
import { isValidRepoName, normalizeRepoName, slugifyRepoName } from '@/lib/github/repo-utils';
import {
  makeEmptyWorkspace,
  makeEpic,
  makeExportPayload,
  makeStory,
} from '../helpers/fixtures';

describe('formatos de exportación', () => {
  const payload = makeExportPayload();

  it('genera JSON con meta Klarify', () => {
    const result = formatProjectAsJson(payload);
    expect(result.extension).toBe('json');
    expect(result.filename).toContain('proyecto-demo');
    const parsed = JSON.parse(result.content);
    expect(parsed.meta.exportedFrom).toBe('Klarify');
    expect(parsed.stories).toHaveLength(1);
  });

  it('genera Markdown con resumen y épicas', () => {
    const result = formatProjectAsMarkdown(payload);
    expect(result.extension).toBe('md');
    expect(result.content).toContain('# Proyecto Demo');
    expect(result.content).toContain('## Resumen del proyecto');
    expect(result.content).toContain('HU-001');
  });

  it('genera CSV con secciones', () => {
    const result = formatProjectAsCsv(payload);
    expect(result.extension).toBe('csv');
    expect(result.content).toContain('# RESUMEN DEL PROYECTO');
    expect(result.content).toContain('# HISTORIAS DE USUARIO');
    expect(result.content).toContain('HU-001');
  });

  it('buildProjectExport despacha por formato', () => {
    expect(buildProjectExport(payload, 'json').extension).toBe('json');
    expect(buildProjectExport(payload, 'markdown').extension).toBe('md');
    expect(buildProjectExport(payload, 'csv').extension).toBe('csv');
  });
});

describe('resolve-project-export', () => {
  it('no permite exportar workspace vacío', () => {
    expect(canExportProject(makeEmptyWorkspace())).toBe(false);
  });

  it('permite exportar cuando hay deseos o historias', () => {
    const withWish = makeEmptyWorkspace({
      agent1: {
        file: null,
        transcription: null,
        discovery: null,
        enrichedContext: null,
        wishes: [
          {
            id: 'DESEO-001',
            text: 'Login',
            source: 'manual',
            isEdited: false,
            createdAt: 1,
          },
        ],
        status: 'approved',
        error: null,
      },
    });
    expect(canExportProject(withWish)).toBe(true);

    const withEpics = makeEmptyWorkspace({
      agent2: {
        input: null,
        epics: [
          makeEpic({
            id: 'EPIC-001',
            title: 'Auth',
            userStories: [makeStory({ id: 'HU-001', title: 'Login' })],
          }),
        ],
        status: 'approved',
        error: null,
      },
    });
    expect(canExportProject(withEpics)).toBe(true);
  });

  it('resuelve payload con resumen coherente', () => {
    const workspace = makeEmptyWorkspace({
      agent1: {
        file: null,
        transcription: null,
        discovery: null,
        enrichedContext: null,
        wishes: [
          {
            id: 'DESEO-001',
            text: 'Login',
            source: 'manual',
            isEdited: false,
            createdAt: 1,
          },
        ],
        status: 'approved',
        error: null,
      },
      agent2: {
        input: null,
        epics: [
          makeEpic({
            id: 'EPIC-001',
            title: 'Auth',
            userStories: [makeStory({ id: 'HU-001', title: 'Login' })],
          }),
        ],
        status: 'approved',
        error: null,
      },
      agent3: {
        input: null,
        estimations: {
          'HU-001': { points: 5, justification: 'ok', isModified: false },
        },
        status: 'approved',
        error: null,
      },
    });

    const payload = resolveProjectExport(workspace, 'Mi Proyecto');
    expect(payload.projectName).toBe('Mi Proyecto');
    expect(payload.summary.epicCount).toBe(1);
    expect(payload.summary.storyCount).toBe(1);
    expect(payload.summary.totalStoryPoints).toBe(5);
    expect(payload.pipelineCompletionPercentage).toBe(60);
  });
});

describe('repo-utils', () => {
  it('slugifica y valida nombres de repositorio', () => {
    expect(slugifyRepoName('Mi Proyecto Ágil!')).toBe('mi-proyecto-agil');
    expect(normalizeRepoName('  Klarify App  ')).toBe('klarify-app');
    expect(isValidRepoName('klarify-app')).toBe(true);
    expect(isValidRepoName('Invalid Name')).toBe(false);
  });
});
