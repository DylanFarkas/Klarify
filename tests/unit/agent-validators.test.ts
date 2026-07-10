import { describe, expect, it } from 'vitest';
import {
  buildEnrichedContext,
  generateWishId,
  validateClarificationAnswers,
  validateFile,
} from '@/lib/services/agent-1-service';
import {
  generateEpicId,
  generateUserStoryId,
  validateAgent2Input,
} from '@/lib/services/agent-2-service';
import { validateAgent3Input } from '@/lib/services/agent-3-service';
import { validateAgent4Input } from '@/lib/services/agent-4-service';
import { validateAgent5Input } from '@/lib/services/agent-5-service';
import { makeEpic, makeStory } from '../helpers/fixtures';
import type { ContextDiscovery } from '@/lib/types/agent-1';

const discovery: ContextDiscovery = {
  isSufficient: false,
  summary: 'Falta plataforma',
  gaps: ['platform'],
  questions: [
    {
      id: 'q1',
      question: '¿Qué plataforma?',
      category: 'platform',
      options: [
        { id: 'web', label: 'Web' },
        { id: 'mobile', label: 'Mobile' },
      ],
    },
  ],
  answers: [],
  skipped: false,
};

describe('validadores Agente 1', () => {
  it('valida tipos y tamaño de archivo', () => {
    expect(validateFile('nota.txt', 100, 'text/plain').valid).toBe(true);
    expect(validateFile('audio.mp3', 100, 'audio/mpeg').valid).toBe(true);
    expect(validateFile('foto.png', 100, 'image/png')).toMatchObject({
      valid: false,
      code: 'INVALID_TYPE',
    });
    expect(validateFile('huge.pdf', 51 * 1024 * 1024, 'application/pdf')).toMatchObject({
      valid: false,
      code: 'FILE_TOO_LARGE',
    });
  });

  it('genera IDs de deseos incrementales', () => {
    expect(generateWishId([])).toBe('DESEO-001');
    expect(
      generateWishId([
        {
          id: 'DESEO-002',
          text: 'x',
          source: 'manual',
          isEdited: false,
          createdAt: 1,
        },
      ])
    ).toBe('DESEO-003');
  });

  it('valida respuestas de clarificación', () => {
    expect(validateClarificationAnswers(discovery, [], true).valid).toBe(true);
    expect(validateClarificationAnswers(discovery, [], false).valid).toBe(false);
    expect(
      validateClarificationAnswers(
        discovery,
        [{ questionId: 'q1', selectedOptionId: 'web' }],
        false
      ).valid
    ).toBe(true);
  });

  it('enriquece contexto con respuestas', () => {
    const text = buildEnrichedContext(
      {
        fullText: 'Reunión inicial',
        segments: [],
        language: 'es',
        duration: 10,
      },
      discovery,
      [{ questionId: 'q1', selectedOptionId: 'web' }],
      false
    );
    expect(text).toContain('Reunión inicial');
    expect(text).toContain('¿Qué plataforma?');
    expect(text).toContain('Web');
  });
});

describe('validadores Agentes 2-5', () => {
  const epic = makeEpic({
    id: 'EPIC-001',
    title: 'Auth',
    userStories: [makeStory({ id: 'HU-001', title: 'Login' })],
  });

  it('valida input del Agente 2 y genera IDs', () => {
    expect(validateAgent2Input(null).code).toBe('NO_INPUT');
    expect(validateAgent2Input({ transcription: null, wishes: [] }).code).toBe('EMPTY_WISHES');
    expect(
      validateAgent2Input({
        transcription: null,
        wishes: [
          {
            id: 'DESEO-001',
            text: 'Login',
            source: 'manual',
            isEdited: false,
            createdAt: 1,
          },
        ],
      }).valid
    ).toBe(true);
    expect(generateEpicId([])).toBe('EPIC-001');
    expect(generateUserStoryId([makeStory({ id: 'HU-004', title: 'x' })])).toBe('HU-005');
  });

  it('valida input del Agente 3', () => {
    expect(validateAgent3Input(null).code).toBe('NO_INPUT');
    expect(
      validateAgent3Input({ epics: [], sourceWishIds: [], approvedAt: 1 }).code
    ).toBe('EMPTY_BACKLOG');
    expect(
      validateAgent3Input({ epics: [epic], sourceWishIds: [], approvedAt: 1 }).valid
    ).toBe(true);
  });

  it('valida input del Agente 4 con estimaciones', () => {
    expect(validateAgent4Input(null).code).toBe('NO_INPUT');
    expect(
      validateAgent4Input({
        epics: [epic],
        estimations: {},
        sourceWishIds: [],
        approvedAt: 1,
      }).code
    ).toBe('MISSING_ESTIMATIONS');
    expect(
      validateAgent4Input({
        epics: [epic],
        estimations: {
          'HU-001': { points: 5, justification: 'ok', isModified: false },
        },
        sourceWishIds: [],
        approvedAt: 1,
      }).valid
    ).toBe(true);
  });

  it('valida input del Agente 5 con estimaciones y prioridades', () => {
    expect(validateAgent5Input(null).code).toBe('NO_INPUT');
    expect(
      validateAgent5Input({
        epics: [epic],
        estimations: {
          'HU-001': { points: 5, justification: 'ok', isModified: false },
        },
        priorities: {},
        framework: 'moscow',
        sourceWishIds: [],
        approvedAt: 1,
      }).code
    ).toBe('MISSING_PRIORITIES');
    expect(
      validateAgent5Input({
        epics: [epic],
        estimations: {
          'HU-001': { points: 5, justification: 'ok', isModified: false },
        },
        priorities: {
          'HU-001': { category: 'must', justification: 'crítico', isModified: false },
        },
        framework: 'moscow',
        sourceWishIds: [],
        approvedAt: 1,
      }).valid
    ).toBe(true);
  });
});
