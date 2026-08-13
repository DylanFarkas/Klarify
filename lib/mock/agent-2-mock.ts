/**
 * @fileoverview Mock data para el Agente 2 — Backlog Inicial.
 */
import { Epic } from '@/lib/types/agent-2';

export const MOCK_BACKLOG: Epic[] = [
  {
    id: 'EPIC-001',
    title: 'Gestión Visual de Proyectos',
    description: 'Funcionalidades para organizar y visualizar el trabajo del equipo.',
    source: 'auto',
    isEdited: false,
    createdAt: Date.now(),
    userStories: [
      {
        id: 'HU-001',
        type: 'story',
        title: 'Tablero Kanban con columnas personalizables',
        description: 'Como Product Owner, quiero un tablero Kanban con columnas personalizables para visualizar el estado de las tareas del equipo.',
        acceptanceCriteria: [
          'El usuario puede crear un tablero con mínimo 3 columnas.',
          'El usuario puede renombrar cada columna.',
          'Las tarjetas se pueden mover entre columnas mediante drag & drop.',
        ],
        sourceWishIds: ['DESEO-001'],
        source: 'auto',
        isEdited: false,
        createdAt: Date.now(),
      },
    ],
  },
];
