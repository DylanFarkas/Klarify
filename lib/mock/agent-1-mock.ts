/**
 * @fileoverview Datos mock del Agente 1 para desarrollo y demostración.
 *
 * Simula la salida de un servicio real de transcripción (ej: Whisper) y
 * extracción de deseos (ej: Gemini). Se sustituirá por llamadas API reales.
 *
 * Escenario: Reunión de discovery con un cliente que necesita un sistema
 * de gestión de proyectos para su equipo de desarrollo.
 */

import type { TranscriptionResult, Wish, ContextDiscovery } from '@/lib/types/agent-1';

// ---------------------------------------------------------------------------
// Transcripción mock — Reunión con cliente sobre gestión de proyectos
// ---------------------------------------------------------------------------

export const MOCK_TRANSCRIPTION: TranscriptionResult = {
  fullText: `[00:00] Facilitador: Buenos días, gracias por reunirse con nosotros hoy. El objetivo de esta sesión es entender sus necesidades principales para el nuevo sistema de gestión de proyectos. ¿Podemos comenzar?

[00:15] Cliente: Sí, claro. Mire, actualmente estamos usando hojas de cálculo para todo y es un desastre. Necesitamos algo visual donde podamos ver el estado de cada tarea de un vistazo.

[00:32] Facilitador: ¿Se refiere a algo como un tablero Kanban?

[00:35] Cliente: Exactamente, un tablero con columnas como "Por hacer", "En progreso" y "Completado". Pero también necesitamos poder crear columnas personalizadas según nuestro flujo de trabajo.

[00:48] Cliente: Otro tema muy importante es la colaboración. Los miembros del equipo necesitan poder dejar comentarios directamente en cada tarea, adjuntar archivos y mencionar a otros compañeros con arroba.

[01:05] Facilitador: Perfecto. ¿Qué hay sobre la priorización de tareas?

[01:10] Cliente: Sí, necesitamos un sistema de prioridades claro. Al menos tres niveles: alta, media y baja. Y poder filtrar y ordenar las tareas por prioridad.

[01:25] Cliente: También necesitamos reportes automáticos. Al final de cada sprint, necesito un informe que muestre qué se completó, qué quedó pendiente y qué está bloqueado. Si pudiera incluir gráficos tipo burndown, sería ideal.

[01:45] Facilitador: ¿Alguna necesidad de integración con otras herramientas?

[01:50] Cliente: Sí, definitivamente necesitamos integración con Google Calendar para sincronizar las fechas límite. Y si es posible, también con Slack para las notificaciones.

[02:05] Cliente: Hablando de notificaciones, necesitamos recibir alertas en tiempo real cuando alguien actualice una tarea que me está asignada o en la que estoy involucrado.

[02:20] Facilitador: ¿Algo más que quiera mencionar?

[02:25] Cliente: Sí, un último punto. Necesitamos que el sistema sea accesible desde el móvil. Muchos de nuestros empleados trabajan en campo y necesitan poder actualizar tareas desde su teléfono.`,

  segments: [
    {
      text: 'Buenos días, gracias por reunirse con nosotros hoy. El objetivo de esta sesión es entender sus necesidades principales para el nuevo sistema de gestión de proyectos. ¿Podemos comenzar?',
      start: 0,
      end: 14,
      confidence: 0.97,
      speaker: 'Facilitador',
    },
    {
      text: 'Sí, claro. Mire, actualmente estamos usando hojas de cálculo para todo y es un desastre. Necesitamos algo visual donde podamos ver el estado de cada tarea de un vistazo.',
      start: 15,
      end: 31,
      confidence: 0.95,
      speaker: 'Cliente',
    },
    {
      text: '¿Se refiere a algo como un tablero Kanban?',
      start: 32,
      end: 34,
      confidence: 0.98,
      speaker: 'Facilitador',
    },
    {
      text: 'Exactamente, un tablero con columnas como "Por hacer", "En progreso" y "Completado". Pero también necesitamos poder crear columnas personalizadas según nuestro flujo de trabajo.',
      start: 35,
      end: 47,
      confidence: 0.94,
      speaker: 'Cliente',
    },
    {
      text: 'Otro tema muy importante es la colaboración. Los miembros del equipo necesitan poder dejar comentarios directamente en cada tarea, adjuntar archivos y mencionar a otros compañeros con arroba.',
      start: 48,
      end: 64,
      confidence: 0.93,
      speaker: 'Cliente',
    },
    {
      text: 'Perfecto. ¿Qué hay sobre la priorización de tareas?',
      start: 65,
      end: 69,
      confidence: 0.99,
      speaker: 'Facilitador',
    },
    {
      text: 'Sí, necesitamos un sistema de prioridades claro. Al menos tres niveles: alta, media y baja. Y poder filtrar y ordenar las tareas por prioridad.',
      start: 70,
      end: 84,
      confidence: 0.96,
      speaker: 'Cliente',
    },
    {
      text: 'También necesitamos reportes automáticos. Al final de cada sprint, necesito un informe que muestre qué se completó, qué quedó pendiente y qué está bloqueado. Si pudiera incluir gráficos tipo burndown, sería ideal.',
      start: 85,
      end: 104,
      confidence: 0.92,
      speaker: 'Cliente',
    },
    {
      text: '¿Alguna necesidad de integración con otras herramientas?',
      start: 105,
      end: 109,
      confidence: 0.98,
      speaker: 'Facilitador',
    },
    {
      text: 'Sí, definitivamente necesitamos integración con Google Calendar para sincronizar las fechas límite. Y si es posible, también con Slack para las notificaciones.',
      start: 110,
      end: 124,
      confidence: 0.95,
      speaker: 'Cliente',
    },
    {
      text: 'Hablando de notificaciones, necesitamos recibir alertas en tiempo real cuando alguien actualice una tarea que me está asignada o en la que estoy involucrado.',
      start: 125,
      end: 139,
      confidence: 0.94,
      speaker: 'Cliente',
    },
    {
      text: '¿Algo más que quiera mencionar?',
      start: 140,
      end: 143,
      confidence: 0.99,
      speaker: 'Facilitador',
    },
    {
      text: 'Sí, un último punto. Necesitamos que el sistema sea accesible desde el móvil. Muchos de nuestros empleados trabajan en campo y necesitan poder actualizar tareas desde su teléfono.',
      start: 145,
      end: 162,
      confidence: 0.93,
      speaker: 'Cliente',
    },
  ],

  duration: 162,
  language: 'es',
};

// ---------------------------------------------------------------------------
// Deseos mock extraídos de la transcripción
// ---------------------------------------------------------------------------

export const MOCK_WISHES: Omit<Wish, 'id'>[] = [
  {
    text: 'Tablero visual tipo Kanban con columnas personalizables para gestión de tareas',
    source: 'auto',
    isEdited: false,
    createdAt: Date.now(),
  },
  {
    text: 'Sistema de comentarios en tareas con soporte para archivos adjuntos y menciones (@)',
    source: 'auto',
    isEdited: false,
    createdAt: Date.now(),
  },
  {
    text: 'Sistema de prioridades con tres niveles (alta, media, baja) con filtros y ordenamiento',
    source: 'auto',
    isEdited: false,
    createdAt: Date.now(),
  },
  {
    text: 'Generación automática de reportes de sprint con gráficos tipo burndown',
    source: 'auto',
    isEdited: false,
    createdAt: Date.now(),
  },
  {
    text: 'Integración con Google Calendar para sincronización de fechas límite',
    source: 'auto',
    isEdited: false,
    createdAt: Date.now(),
  },
  {
    text: 'Integración con Slack para notificaciones del equipo',
    source: 'auto',
    isEdited: false,
    createdAt: Date.now(),
  },
  {
    text: 'Notificaciones en tiempo real sobre cambios en tareas asignadas',
    source: 'auto',
    isEdited: false,
    createdAt: Date.now(),
  },
  {
    text: 'Aplicación móvil responsive para trabajo en campo',
    source: 'auto',
    isEdited: false,
    createdAt: Date.now(),
  },
];

// ---------------------------------------------------------------------------
// Discovery mock — preguntas para contexto vago
// ---------------------------------------------------------------------------

export const MOCK_DISCOVERY_INSUFFICIENT: ContextDiscovery = {
  isSufficient: false,
  summary:
    'Entendemos que quieres crear una aplicación, pero aún faltan detalles clave sobre plataforma, usuarios y alcance funcional para armar un backlog sólido.',
  gaps: [
    'Plataforma no definida (web, móvil o ambas)',
    'Usuarios y roles no especificados',
    'Alcance funcional muy general',
    'Modelo de negocio o monetización sin definir',
  ],
  questions: [
    {
      id: 'q-1',
      question: '¿En qué plataforma debe funcionar la aplicación?',
      category: 'platform',
      options: [
        { id: 'opt-1', label: 'Solo web (navegador)' },
        { id: 'opt-2', label: 'Solo móvil (iOS/Android)' },
        { id: 'opt-3', label: 'Web + móvil' },
      ],
    },
    {
      id: 'q-2',
      question: '¿Quiénes serán los usuarios principales?',
      category: 'users',
      options: [
        { id: 'opt-1', label: 'Solo clientes finales (B2C)' },
        { id: 'opt-2', label: 'Empresas y sus empleados (B2B)' },
        { id: 'opt-3', label: 'Clientes y administradores internos' },
      ],
    },
    {
      id: 'q-3',
      question: '¿Cuál es el alcance funcional inicial (MVP)?',
      category: 'scope',
      options: [
        { id: 'opt-1', label: 'Catálogo + carrito + checkout básico' },
        { id: 'opt-2', label: 'Catálogo + pagos + panel de administración' },
        { id: 'opt-3', label: 'Marketplace con vendedores y compradores' },
      ],
    },
    {
      id: 'q-4',
      question: '¿Cómo se procesarán los pagos?',
      category: 'business',
      options: [
        { id: 'opt-1', label: 'Pasarela online (tarjeta, PayPal, etc.)' },
        { id: 'opt-2', label: 'Pago contra entrega / transferencia' },
        { id: 'opt-3', label: 'Aún no definido' },
      ],
    },
  ],
  answers: [],
  skipped: false,
};

export const MOCK_DISCOVERY_SUFFICIENT: ContextDiscovery = {
  isSufficient: true,
  summary:
    'El contexto incluye requisitos detallados sobre funcionalidades, integraciones y restricciones técnicas suficientes para generar un backlog.',
  gaps: [],
  questions: [],
  answers: [],
  skipped: false,
};
