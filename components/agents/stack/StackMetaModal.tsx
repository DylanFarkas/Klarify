/**
 * @fileoverview Modal para definir tipo de producto y patrón de arquitectura del stack.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DropdownSelect } from '@/components/ui/DropdownSelect';
import {
  STACK_ARCHITECTURE_OPTIONS,
  STACK_META_CUSTOM_VALUE,
  STACK_PRODUCT_KIND_OPTIONS,
  resolveStackMetaField,
  resolveStackMetaSelectValue,
} from '@/lib/constants/stack-meta-options';
import { lockPageScroll } from '@/lib/utils/scroll-lock';

interface StackMetaModalProps {
  open: boolean;
  productKind: string;
  architecturePattern: string;
  onClose: () => void;
  onApply: (productKind: string, architecturePattern: string) => void;
}

export function StackMetaModal({
  open,
  productKind,
  architecturePattern,
  onClose,
  onApply,
}: StackMetaModalProps) {
  const [mounted, setMounted] = useState(false);
  const [productMode, setProductMode] = useState('');
  const [productCustom, setProductCustom] = useState('');
  const [architectureMode, setArchitectureMode] = useState('');
  const [architectureCustom, setArchitectureCustom] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const product = resolveStackMetaSelectValue(productKind, STACK_PRODUCT_KIND_OPTIONS);
    const architecture = resolveStackMetaSelectValue(
      architecturePattern,
      STACK_ARCHITECTURE_OPTIONS
    );

    setProductMode(product.mode);
    setProductCustom(product.custom);
    setArchitectureMode(architecture.mode);
    setArchitectureCustom(architecture.custom);
  }, [open, productKind, architecturePattern]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);
    const unlockScroll = lockPageScroll();

    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [open, onClose]);

  const handleBackdrop = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose]
  );

  const resolvedProductKind = resolveStackMetaField(productMode, productCustom);
  const resolvedArchitecture = resolveStackMetaField(architectureMode, architectureCustom);
  const canApply = Boolean(resolvedProductKind && resolvedArchitecture);

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={handleBackdrop}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stack-meta-title"
      >
        <h3 id="stack-meta-title" className="text-[15px] font-semibold text-foreground">
          Producto y arquitectura
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Elige una opción del catálogo o escribe una personalizada para guiar la selección de
          tecnologías.
        </p>

        <label className="mt-4 block text-xs font-medium text-subtle">Tipo de producto</label>
        <DropdownSelect
          value={productMode}
          onChange={setProductMode}
          options={[...STACK_PRODUCT_KIND_OPTIONS]}
          placeholder="Selecciona un tipo de producto"
          aria-label="Tipo de producto"
          className="mt-1"
        />
        {productMode === STACK_META_CUSTOM_VALUE ? (
          <input
            value={productCustom}
            onChange={(event) => setProductCustom(event.target.value)}
            placeholder="Ej. SaaS de facturación para pymes"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none"
          />
        ) : null}

        <label className="mt-3 block text-xs font-medium text-subtle">Patrón de arquitectura</label>
        <DropdownSelect
          value={architectureMode}
          onChange={setArchitectureMode}
          options={[...STACK_ARCHITECTURE_OPTIONS]}
          placeholder="Selecciona un patrón de arquitectura"
          aria-label="Patrón de arquitectura"
          className="mt-1"
        />
        {architectureMode === STACK_META_CUSTOM_VALUE ? (
          <input
            value={architectureCustom}
            onChange={(event) => setArchitectureCustom(event.target.value)}
            placeholder="Ej. Backend for frontend + microservicios"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none"
          />
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-foreground cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={() => onApply(resolvedProductKind, resolvedArchitecture)}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
