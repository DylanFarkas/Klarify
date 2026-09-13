"use client";

import { StackTechIcon } from "@/components/agents/stack/StackTechIcon";
import { DEMO_STACK_LAYERS, DEMO_STACK_META } from "./demo-data";

interface DemoStackViewProps {
  onAskKlark: () => void;
}

export function DemoStackView({ onAskKlark }: DemoStackViewProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Stack tecnológico
          </h1>
          <p className="mt-1 text-sm text-muted">
            Arquitectura y tecnologías para implementar el backlog actual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            tabIndex={-1}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onAskKlark}
            className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Preguntar a Klark
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted"
          >
            Limpiar stack
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">Producto</p>
            <p className="font-mono text-[15px] font-semibold tracking-tight text-foreground">
              {DEMO_STACK_META.productKind}
            </p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
              Arquitectura
            </p>
            <p className="text-sm text-muted">{DEMO_STACK_META.architecturePattern}</p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {DEMO_STACK_LAYERS.map((layer) => (
            <div
              key={layer.label}
              className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-4 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)]"
            >
              <p className="pt-0.5 text-xs font-medium text-subtle">{layer.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {layer.items.map((item) => (
                  <span
                    key={`${layer.label}-${item.catalogId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted/30 px-2 py-1 text-[13px] font-medium text-foreground"
                  >
                    <StackTechIcon item={{ catalogId: item.catalogId }} size={18} />
                    {item.name}
                    {item.primary ? (
                      <span className="text-[10px] font-normal text-subtle">· primario</span>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] font-medium text-subtle">Justificación</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted whitespace-pre-wrap">
            {DEMO_STACK_META.rationale}
          </p>
        </div>
      </div>
    </div>
  );
}
