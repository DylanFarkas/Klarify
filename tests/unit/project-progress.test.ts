import { describe, expect, it } from 'vitest';
import { slugifyExportFilename } from '@/lib/export/filename';
import {
  computePipelineProgress,
  getProjectEntryPath,
} from '@/lib/utils/project-progress';
import type { UserWorkspace } from '@/lib/types/workspace';

function buildWorkspace(overrides: Partial<UserWorkspace> = {}): UserWorkspace {
  const base: UserWorkspace = {
    agent1: {
      file: null,
      transcription: null,
      discovery: null,
      enrichedContext: null,
      wishes: [],
      status: 'idle',
      error: null,
    },
    agent2: {
      input: null,
      epics: [],
      status: 'idle',
      error: null,
    },
    agent3: {
      input: null,
      estimations: {},
      status: 'idle',
      error: null,
    },
    agent4: {
      input: null,
      priorities: {},
      framework: 'moscow',
      status: 'idle',
      error: null,
    },
    agent5: {
      input: null,
      plan: null,
      status: 'idle',
      error: null,
    },
    pipeline: {
      agent2Input: null,
      agent3Input: null,
      agent4Input: null,
      agent5Input: null,
      agent6Input: null,
    },
  };

  return {
    ...base,
    ...overrides,
    agent1: { ...base.agent1, ...overrides.agent1 },
    agent2: { ...base.agent2, ...overrides.agent2 },
    agent3: { ...base.agent3, ...overrides.agent3 },
    agent4: { ...base.agent4, ...overrides.agent4 },
    agent5: { ...base.agent5, ...overrides.agent5 },
    pipeline: { ...base.pipeline, ...overrides.pipeline },
  };
}

describe('slugifyExportFilename', () => {
  it('normaliza acentos y espacios', () => {
    expect(slugifyExportFilename('Proyecto Ágil Klarify')).toBe('proyecto-agil-klarify');
  });

  it('usa fallback cuando el nombre queda vacío', () => {
    expect(slugifyExportFilename('@@@')).toBe('proyecto');
  });
});

describe('progreso del pipeline', () => {
  it('inicia en el paso 1 con 0% si no hay avances', () => {
    const progress = computePipelineProgress(buildWorkspace());
    expect(progress.pipelineStep).toBe(1);
    expect(progress.completionPercentage).toBe(0);
    expect(progress.pipelineLabel).toBe('Ingesta de contexto');
  });

  it('avanza el porcentaje cuando hay agentes aprobados', () => {
    const progress = computePipelineProgress(
      buildWorkspace({
        agent1: {
          file: null,
          transcription: null,
          discovery: null,
          enrichedContext: null,
          wishes: [
            {
              id: 'DESEO-001',
              text: 'Quiero autenticación',
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
          epics: [],
          status: 'approved',
          error: null,
        },
      })
    );
    expect(progress.pipelineStep).toBe(2);
    expect(progress.completionPercentage).toBe(Math.round((2 / 6) * 100));
  });

  it('resuelve la ruta de entrada según lastAgent y pipelineStep', () => {
    expect(getProjectEntryPath({ pipelineStep: 3, lastAgent: '2' })).toBe('/agentes/3');
    expect(getProjectEntryPath({ pipelineStep: 6, lastAgent: '5' })).toBe('/agentes/dashboard');
    expect(getProjectEntryPath({ pipelineStep: 2, lastAgent: 'dashboard' })).toBe(
      '/agentes/dashboard'
    );
  });
});
