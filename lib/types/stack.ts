/**
 * @fileoverview Tipos del módulo Stack (arquitectura y tecnologías del proyecto).
 */

/** Capas del tablero de stack */
export type StackLayerId =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'auth'
  | 'hosting'
  | 'styling'
  | 'orm'
  | 'realtime'
  | 'storage'
  | 'testing'
  | 'payments'
  | 'mobile'
  | 'cms'
  | 'messaging'
  | 'monitoring'
  | 'devops';

/** Ítem del stack: catálogo o custom */
export interface StackItem {
  /** ID del catálogo (`lib/constants/tech-catalog.ts`) */
  catalogId?: string;
  /** Nombre libre si no está en catálogo */
  customName?: string;
  /** Primario en capas con cardinalidad (frontend, backend, database) */
  isPrimary?: boolean;
}

export type StackStatus = 'empty' | 'proposed' | 'saved';
export type StackSource = 'manual' | 'ai' | 'mixed';

export interface StackWarning {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface StackSourceRef {
  title: string;
  url: string;
}

/** Estado persistido en `UserWorkspace.stack` */
export interface ProjectStack {
  status: StackStatus;
  source: StackSource;
  productKind: string;
  architecturePattern: string;
  layers: Partial<Record<StackLayerId, StackItem[]>>;
  rationale?: string;
  warnings?: StackWarning[];
  sources?: StackSourceRef[];
  updatedAt: number;
}

/** Entrada del catálogo curado de tecnologías */
export interface TechCatalogEntry {
  id: string;
  name: string;
  aliases: string[];
  layer: StackLayerId;
  iconSlug: string;
  hex: string;
  implies?: string[];
  conflicts?: string[];
  tags?: string[];
  /** Solo una primaria por capa (frontend, backend, database) */
  primaryEligible?: boolean;
}

/** Respuesta cruda del LLM para recomendación */
export interface StackRecommendRaw {
  productKind: string;
  architecturePattern: string;
  layers: Partial<
    Record<
      StackLayerId,
      Array<{ catalogId?: string; customName?: string; isPrimary?: boolean }>
    >
  >;
  rationale: string;
  researchQueries?: string[];
}

export interface StackRecommendResponse {
  stack: ProjectStack;
}

export const STACK_LAYER_LABELS: Record<StackLayerId, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Datos',
  auth: 'Autenticación',
  hosting: 'Infraestructura',
  styling: 'Estilos',
  orm: 'ORM / acceso a datos',
  realtime: 'Tiempo real',
  storage: 'Almacenamiento',
  testing: 'Testing',
  payments: 'Pagos',
  mobile: 'Mobile',
  cms: 'CMS',
  messaging: 'Mensajería',
  monitoring: 'Observabilidad',
  devops: 'DevOps / CI',
};

/** Capas donde solo puede haber un ítem primario */
export const PRIMARY_STACK_LAYERS: readonly StackLayerId[] = [
  'frontend',
  'backend',
  'database',
] as const;

export const ALL_STACK_LAYERS: readonly StackLayerId[] = [
  'frontend',
  'backend',
  'database',
  'auth',
  'hosting',
  'styling',
  'orm',
  'realtime',
  'storage',
  'testing',
  'payments',
  'mobile',
  'cms',
  'messaging',
  'monitoring',
  'devops',
] as const;

export function createEmptyStack(): ProjectStack {
  return {
    status: 'empty',
    source: 'manual',
    productKind: '',
    architecturePattern: '',
    layers: {},
    updatedAt: Date.now(),
  };
}

export function getStackItemLabel(
  item: StackItem,
  catalogLookup: (id: string) => { name: string } | undefined
): string {
  if (item.catalogId) {
    return catalogLookup(item.catalogId)?.name ?? item.catalogId;
  }
  return item.customName?.trim() || 'Sin nombre';
}
