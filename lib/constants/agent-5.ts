/**
 * @fileoverview Constantes del Agente 5 — Planificación de Sprints.
 */

export const DEFAULT_SPRINT_CAPACITY_SP = 20;
export const DEFAULT_SPRINT_DURATION_WEEKS = 2;

export type SprintConfigFieldId = 'capacity' | 'duration' | 'start';

export const SPRINT_CONFIG_DESCRIPTIONS: Record<
  SprintConfigFieldId,
  { label: string; summary: string; details: string }
> = {
  capacity: {
    label: 'Capacidad',
    summary: 'Máximo de Story Points que el equipo puede completar por sprint.',
    details:
      'Define cuántas historias caben en cada iteración. La IA distribuye el backlog respetando este límite; las que no quepan quedan sin asignar.',
  },
  duration: {
    label: 'Duración',
    summary: 'Longitud de cada sprint en semanas.',
    details:
      'Establece el marco temporal de cada iteración (típicamente 2 semanas). Se usa para calcular las fechas de fin de cada sprint en el cronograma.',
  },
  start: {
    label: 'Inicio',
    summary: 'Fecha de arranque del Sprint 1 del proyecto.',
    details:
      'Ancla el cronograma al generar o regenerar. Después puedes ajustar fechas de cada sprint individualmente sin regenerar.',
  },
};
export const SPRINT_ID_PREFIX = 'SPRINT';
export const MOSCOW_PRIORITY_ORDER = ['must', 'should', 'could', 'wont'] as const;

export const SPRINT_COLORS = [
  'border-l-blue-400',
  'border-l-emerald-400',
  'border-l-amber-400',
  'border-l-purple-400',
  'border-l-rose-400',
  'border-l-cyan-400',
];

export const MOCK_SPRINT_PLANNING_PREFIX = 'Agente 5 (Mock Scrum Master):';
export const GEMINI_SPRINT_PLANNING_PREFIX = 'Agente 5 (Scrum Master):';
export const FOUNDATIONAL_INFERENCE_PREFIX = 'Agente 5 (Capacidad habilitante):';

export const MOCK_SPRINT_PLANNING_THOUGHTS = [
  'Analizando el backlog priorizado y sus Story Points...',
  'Identificando capacidades habilitantes (usuarios, roles, autenticación, infraestructura)...',
  'Inferiendo dependencias entre historias consumidoras y habilitantes...',
  'Distribuyendo historias en sprints según capacidad, prioridad y dependencias...',
  'Calculando velocidad estimada por sprint...',
  'Generando cronograma con fechas de inicio y fin...',
];

export const SPRINT_PLANNING_DELAY_MS = 3000;

export const MOCK_SPRINT_GOALS = [
  'Configuración inicial del proyecto y funcionalidades core de autenticación',
  'Implementación de funcionalidades principales del producto',
  'Mejoras de experiencia de usuario y funcionalidades secundarias',
  'Funcionalidades complementarias y pulido general',
];
