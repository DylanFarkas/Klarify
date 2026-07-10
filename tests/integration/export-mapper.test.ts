import { describe, expect, it } from 'vitest';
import {
  buildEpicIssueBody,
  buildExportableBacklog,
  buildSprintMilestoneTitle,
  buildStoryIssueBody,
} from '@/lib/github/export-mapper';
import type { Agent6Input } from '@/lib/types/workspace';
import type { Epic } from '@/lib/types/agent-2';

const now = 1_720_000_000_000;

const epic: Epic = {
  id: 'EPIC-001',
  title: 'Autenticación',
  description: 'Permitir acceso seguro a la plataforma',
  source: 'auto',
  isEdited: false,
  createdAt: now,
  userStories: [
    {
      id: 'HU-001',
      title: 'Login con Google',
      description: 'Como usuario quiero iniciar sesión con Google',
      acceptanceCriteria: ['Puedo autenticarme', 'Se crea la sesión'],
      sourceWishIds: ['DESEO-001'],
      source: 'auto',
      isEdited: false,
      createdAt: now,
    },
    {
      id: 'HU-002',
      title: 'Logout',
      description: 'Como usuario quiero cerrar sesión',
      acceptanceCriteria: ['La sesión se invalida'],
      sourceWishIds: ['DESEO-001'],
      source: 'auto',
      isEdited: false,
      createdAt: now,
    },
  ],
};

function buildInput(): Agent6Input {
  return {
    epics: [epic],
    estimations: {
      'HU-001': { points: 5, justification: 'OAuth estándar', isModified: false },
      'HU-002': { points: 2, justification: 'Flujo simple', isModified: false },
    },
    priorities: {
      'HU-001': {
        category: 'must',
        justification: 'Crítico para acceso',
        isModified: false,
      },
      'HU-002': {
        category: 'should',
        justification: 'Importante',
        isModified: false,
      },
    },
    framework: 'moscow',
    plan: {
      sprints: [
        {
          id: 'SPRINT-1',
          number: 1,
          sprintGoal: 'Habilitar acceso',
          startDate: '2026-07-01',
          endDate: '2026-07-14',
          velocitySp: 8,
          storyIds: ['HU-001', 'HU-002'],
          isEdited: false,
        },
      ],
      dependencies: [
        {
          storyId: 'HU-002',
          dependsOnStoryId: 'HU-001',
          reason: 'Necesita sesión activa',
        },
      ],
      unassignedStoryIds: [],
      config: {
        sprintCapacitySp: 20,
        sprintDurationWeeks: 2,
        projectStartDate: '2026-07-01',
      },
    },
    sourceWishIds: ['DESEO-001'],
    approvedAt: now,
  };
}

describe('export-mapper (integración GitHub export)', () => {
  it('construye un backlog exportable con puntos, prioridad y sprint', () => {
    const backlog = buildExportableBacklog(buildInput());

    expect(backlog.epics).toHaveLength(1);
    expect(backlog.stories).toHaveLength(2);
    expect(backlog.stories[0]).toMatchObject({
      points: 5,
      priorityCategory: 'must',
      priorityLabel: 'Must Have',
    });
    expect(backlog.stories[0].sprint?.number).toBe(1);
    expect(backlog.stories[1].dependencies).toHaveLength(1);
  });

  it('genera cuerpo de issue de épica con historias incluidas', () => {
    const body = buildEpicIssueBody(epic);
    expect(body).toContain('Permitir acceso seguro');
    expect(body).toContain('HU-001: Login con Google');
    expect(body).toContain('Exportado desde Klarify');
  });

  it('genera cuerpo de issue de historia con metadatos y dependencias', () => {
    const backlog = buildExportableBacklog(buildInput());
    const story = backlog.stories.find((item) => item.story.id === 'HU-002')!;
    const body = buildStoryIssueBody(story, backlog.stories);

    expect(body).toContain('## Criterios de aceptación');
    expect(body).toContain('Depende de **HU-001**');
    expect(body).toContain('Story Points:** 2');
    expect(body).toContain('Sprint 1');
  });

  it('genera título de milestone de sprint', () => {
    expect(buildSprintMilestoneTitle(buildInput().plan.sprints[0])).toBe(
      'Sprint 1: Habilitar acceso'
    );
  });
});
