/**
 * @fileoverview Constantes del Agente 5 — Planificación de Sprints.
 */

export const DEFAULT_SPRINT_CAPACITY_SP = 20;
export const DEFAULT_SPRINT_DURATION_WEEKS = 2;
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

export const DEPENDENCY_KEYWORDS = [
  { word: 'dashboard', dependsOn: ['login', 'autenticación', 'iniciar sesión', 'registro'] },
  { word: 'perfil', dependsOn: ['login', 'autenticación', 'registro'] },
  { word: 'notificación', dependsOn: ['login', 'registro'] },
  { word: 'pago', dependsOn: ['login', 'registro', 'carrito'] },
  { word: 'carrito', dependsOn: ['catálogo', 'producto'] },
  { word: 'checkout', dependsOn: ['carrito', 'pago'] },
  { word: 'búsqueda', dependsOn: ['catálogo', 'producto'] },
  { word: 'reporte', dependsOn: ['dashboard'] },
  { word: 'admin', dependsOn: ['login', 'dashboard'] },
  { word: 'configuración', dependsOn: ['login'] },
  { word: 'recuperar', dependsOn: ['registro', 'login'] },
];

export const MOCK_SPRINT_PLANNING_PREFIX = 'Agente 5 (Mock Scrum Master):';
export const GEMINI_SPRINT_PLANNING_PREFIX = 'Agente 5 (Scrum Master):';

export const SPRINT_PLANNING_DELAY_MS = 3000;

export const MOCK_SPRINT_GOALS = [
  'Configuración inicial del proyecto y funcionalidades core de autenticación',
  'Implementación de funcionalidades principales del producto',
  'Mejoras de experiencia de usuario y funcionalidades secundarias',
  'Funcionalidades complementarias y pulido general',
];
