/**
 * @fileoverview Barril público de la capa LLM (solo tipos/catálogo en cliente).
 *
 * Credenciales, crypto y resolve son server-only: importarlos desde
 * `@/lib/llm/resolve` (o rutas API), nunca desde componentes cliente.
 */

export * from '@/lib/llm/types';
export * from '@/lib/llm/catalog';
