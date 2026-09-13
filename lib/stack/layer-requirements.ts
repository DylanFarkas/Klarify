/**
 * @fileoverview Inferencia de capas de stack relevantes según backlog y contexto.
 * Evita recomendar tecnologías especializadas (realtime, pagos, etc.) sin necesidad.
 */

import type { ProjectStack, StackLayerId } from '@/lib/types/stack';
import { ALL_STACK_LAYERS, STACK_LAYER_LABELS } from '@/lib/types/stack';
import type { UserWorkspace } from '@/lib/types/workspace';
import { getLiveBacklog } from '@/lib/utils/live-backlog';

/** Capas que casi siempre aplican a un producto web con backend */
const DEFAULT_WEB_LAYERS: StackLayerId[] = [
  'frontend',
  'backend',
  'database',
  'auth',
  'hosting',
  'styling',
  'orm',
  'testing',
];

/** Capas base para producto mobile-first sin web */
const DEFAULT_MOBILE_LAYERS: StackLayerId[] = [
  'mobile',
  'backend',
  'database',
  'hosting',
];

/** Capas que solo deben aparecer si el contexto lo justifica */
export const GATED_STACK_LAYERS: readonly StackLayerId[] = [
  'realtime',
  'payments',
  'mobile',
  'cms',
  'messaging',
  'storage',
  'monitoring',
  'devops',
] as const;

const LAYER_SIGNALS: Partial<Record<StackLayerId, RegExp[]>> = {
  realtime: [
    /\breal[\s-]?time\b/i,
    /tiempo real/i,
    /websocket/i,
    /socket\.?io/i,
    /live update/i,
    /multijugador/i,
    /multiplayer/i,
    /pvp\b/i,
    /partida(s)? en (vivo|linea|línea)/i,
    /juego(s)? online/i,
    /online play/i,
    /matchmaking/i,
    /sincronizaci[oó]n (en vivo|instant)/i,
    /chat en vivo/i,
    /colaboraci[oó]n en vivo/i,
    /notificaci[oó]n(es)? instant/i,
    /presence\b/i,
    /co-?editing/i,
  ],
  payments: [
    /\bpago(s)?\b/i,
    /\bpayment(s)?\b/i,
    /stripe|paypal|mercadopago|checkout/i,
    /suscripci[oó]n/i,
    /billing|facturaci[oó]n/i,
    /monetiz/i,
    /e-?commerce/i,
    /tienda online/i,
    /carrito/i,
    /marketplace.*(pago|cobro|venta)/i,
  ],
  mobile: [
    /\bm[oó]vil\b/i,
    /\bmobile\b/i,
    /\bios\b/i,
    /\bandroid\b/i,
    /app nativ/i,
    /react native/i,
    /flutter/i,
    /\bexpo\b/i,
    /cross-?platform app/i,
    /app store|play store/i,
  ],
  cms: [
    /\bcms\b/i,
    /content management/i,
    /headless cms/i,
    /strapi|sanity|contentful/i,
    /blog editorial/i,
    /gesti[oó]n de contenido/i,
  ],
  messaging: [
    /email transaccional/i,
    /cola de mensajes/i,
    /message queue/i,
    /push notification/i,
    /\bsms\b/i,
    /twilio|sendgrid|mailgun|resend/i,
    /notificaci[oó]n(es)? (por email|push)/i,
  ],
  storage: [
    /upload/i,
    /subir (archivo|imagen|video)/i,
    /almacenamiento de (archivo|media|imagen)/i,
    /file storage/i,
    /blob storage/i,
    /\bs3\b/i,
    /cloudinary|cloud storage/i,
    /adjunto(s)?/i,
    /galer[ií]a de (imagen|media)/i,
  ],
  monitoring: [
    /monitor(eo|ing)/i,
    /observabilidad/i,
    /\bsentry\b/i,
    /datadog|new relic/i,
    /logging centralizado/i,
    /m[eé]tricas de producci[oó]n/i,
    /\bapm\b/i,
  ],
  devops: [
    /\bci\/?cd\b/i,
    /\bdocker\b/i,
    /kubernetes|\bk8s\b/i,
    /terraform/i,
    /\bdevops\b/i,
    /pipeline de despliegue/i,
    /infraestructura como c[oó]digo/i,
  ],
};

const AUTH_SIGNALS =
  /login|autentic|usuario(s)?|cuenta(s)?|registro|sign[\s-]?up|oauth|rol(es)?|permiso(s)?|multi-?tenant|membership|perfil de usuario/i;

const NO_AUTH_SIGNALS =
  /sin (login|autentic|cuenta)|público sin registro|landing estática|sin usuarios|no requiere cuenta/i;

const WEB_SIGNALS =
  /web|spa\b|next\.?js|react|vue|angular|dashboard|panel admin|landing|sitio|p[aá]gina/i;

function layerMatchesSignals(layer: StackLayerId, text: string): boolean {
  const patterns = LAYER_SIGNALS[layer];
  if (!patterns?.length) return false;
  return patterns.some((pattern) => pattern.test(text));
}

export interface StackLayerRequirements {
  isMobileProduct: boolean;
  isWebProduct: boolean;
  allowedLayers: Set<StackLayerId>;
  excludedOptional: StackLayerId[];
}

export function buildProjectContextForStack(workspace: UserWorkspace): string {
  const parts: string[] = [];

  if (workspace.agent1.enrichedContext) {
    parts.push(workspace.agent1.enrichedContext);
  }
  const discovery = workspace.agent1.discovery;
  if (discovery?.summary) parts.push(discovery.summary);
  if (discovery?.gaps?.length) parts.push(discovery.gaps.join('\n'));

  const wishes = workspace.agent1.wishes ?? [];
  if (wishes.length) {
    parts.push(wishes.map((w) => w.text).join('\n'));
  }

  const live = getLiveBacklog(workspace);
  for (const epic of live.epics) {
    parts.push(`${epic.title} ${epic.description}`);
    for (const story of epic.userStories) {
      parts.push(`${story.title} ${story.description ?? ''}`);
      if (story.acceptanceCriteria.length) {
        parts.push(story.acceptanceCriteria.join(' '));
      }
    }
  }

  return parts.join('\n');
}

export function inferStackLayerRequirements(contextText: string): StackLayerRequirements {
  const isMobileProduct = layerMatchesSignals('mobile', contextText);
  const isWebProduct = WEB_SIGNALS.test(contextText) || !isMobileProduct;

  const allowed = new Set<StackLayerId>();

  if (isMobileProduct && !isWebProduct) {
    for (const layer of DEFAULT_MOBILE_LAYERS) allowed.add(layer);
  } else {
    for (const layer of DEFAULT_WEB_LAYERS) allowed.add(layer);
    if (isMobileProduct && isWebProduct) allowed.add('mobile');
  }

  if (NO_AUTH_SIGNALS.test(contextText)) {
    allowed.delete('auth');
  } else if (isMobileProduct && !isWebProduct && !AUTH_SIGNALS.test(contextText)) {
    allowed.delete('auth');
  }

  for (const layer of GATED_STACK_LAYERS) {
    if (layer === 'mobile') {
      if (isMobileProduct) allowed.add('mobile');
      continue;
    }
    if (layerMatchesSignals(layer, contextText)) {
      allowed.add(layer);
    }
  }

  const excludedOptional = GATED_STACK_LAYERS.filter((layer) => !allowed.has(layer));

  return {
    isMobileProduct,
    isWebProduct,
    allowedLayers: allowed,
    excludedOptional,
  };
}

export function formatStackLayerGuidance(requirements: StackLayerRequirements): string {
  const allowed = ALL_STACK_LAYERS.filter((layer) => requirements.allowedLayers.has(layer))
    .map((layer) => STACK_LAYER_LABELS[layer])
    .join(', ');

  const excluded = requirements.excludedOptional
    .map((layer) => STACK_LAYER_LABELS[layer])
    .join(', ');

  const lines = [
    'Reglas de capas para esta recomendación:',
    `- Incluye SOLO capas relevantes para el backlog y contexto del proyecto.`,
    `- Capas permitidas ahora: ${allowed}.`,
  ];

  if (excluded) {
    lines.push(
      `- NO incluyas capas sin evidencia en el backlog: ${excluded}.`,
      `- Ejemplos: realtime solo si hay multijugador/chat/sincronización en vivo; pagos solo si hay cobros; storage solo si hay uploads/archivos; CMS solo si hay gestión editorial.`
    );
  }

  lines.push(
    '- auth por defecto en productos web con usuarios; omítela solo si el producto es público sin cuentas.',
    '- Si el usuario pide explícitamente una capa extra al iterar contigo, puedes añadirla.'
  );

  return lines.join('\n');
}

export function pruneStackToAllowedLayers(
  stack: ProjectStack,
  requirements: StackLayerRequirements
): ProjectStack {
  const layers: ProjectStack['layers'] = {};

  for (const [layer, items] of Object.entries(stack.layers)) {
    const layerId = layer as StackLayerId;
    if (!items?.length) continue;
    if (requirements.allowedLayers.has(layerId)) {
      layers[layerId] = items;
    }
  }

  return { ...stack, layers };
}

export function getUnjustifiedLayerWarnings(
  stack: ProjectStack,
  requirements: StackLayerRequirements
): import('@/lib/types/stack').StackWarning[] {
  const warnings: import('@/lib/types/stack').StackWarning[] = [];

  for (const layer of GATED_STACK_LAYERS) {
    const items = stack.layers[layer];
    if (!items?.length) continue;
    if (!requirements.allowedLayers.has(layer)) {
      warnings.push({
        code: 'UNJUSTIFIED_LAYER',
        message: `La capa «${STACK_LAYER_LABELS[layer]}» no parece necesaria según el backlog. Confírmala o elimínala.`,
        severity: 'warning',
      });
    }
  }

  return warnings;
}
