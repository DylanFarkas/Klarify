/**
 * @fileoverview Hook cliente para estado del proveedor de IA (BYOK + modelo).
 * Delega en AiProviderContext para un único fetch compartido.
 */

'use client';

export { useAiProviderContext as useAiProvider } from '@/context/AiProviderContext';
