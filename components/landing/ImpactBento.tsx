"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type HorizontalBar = {
  label: string;
  value: string;
  width: string;
  emphasized?: boolean;
};

type VerticalBar = {
  label: string;
  value: string;
  height: string;
  emphasized?: boolean;
};

const planningBars: HorizontalBar[] = [
  { label: "Klarify", value: "2 h", width: "100%", emphasized: true },
  { label: "PO manual", value: "12 h", width: "42%" },
  { label: "Docs ad-hoc", value: "16 h", width: "28%" },
];

const readinessBars: VerticalBar[] = [
  { label: "Klarify", value: "95%", height: "100%", emphasized: true },
  { label: "Promedio industria", value: "40%", height: "42%" },
];

function TrendIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-white/45" fill="none" viewBox="0 0 16 16">
      <path
        d="M2 11.5 6.2 7.3l2.6 2.6L14 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M10.5 4.5H14V8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-white/45" fill="none" viewBox="0 0 16 16">
      <path
        d="M4.5 3.5h7A1.5 1.5 0 0 1 13 5v7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 12V5a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="m5.75 8.25 1.5 1.5 3-3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function BentoCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`flex min-h-70 flex-col rounded-2xl border border-white/10 bg-[#131313] p-7 sm:min-h-80 sm:p-8 md:p-9 ${className}`}
    >
      {children}
    </article>
  );
}

function HorizontalBars({ active, bars }: { active: boolean; bars: HorizontalBar[] }) {
  return (
    <ul className="mt-auto flex flex-col justify-end gap-6 pt-10">
      {bars.map((bar) => (
        <li key={bar.label}>
          <div className="mb-2.5 flex items-baseline justify-between gap-4">
            <span className={`text-base ${bar.emphasized ? "text-white" : "text-white/45"}`}>
              {bar.label}
            </span>
            <span
              className={`font-mono text-base tabular-nums ${
                bar.emphasized ? "text-white" : "text-white/40"
              }`}
            >
              {bar.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-white/6">
            <div
              className={`h-full rounded-sm transition-[width] duration-1000 ease-out ${
                bar.emphasized ? "bg-white" : "bg-white/25"
              }`}
              style={{ width: active ? bar.width : "0%" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function VerticalBars({ active, bars }: { active: boolean; bars: VerticalBar[] }) {
  return (
    <div className="mt-auto flex h-52 items-end justify-center gap-10 pt-8 sm:h-60 sm:gap-14">
      {bars.map((bar) => (
        <div className="flex h-full w-18 flex-col items-center sm:w-22" key={bar.label}>
          <span
            className={`mb-3 font-mono text-base tabular-nums ${
              bar.emphasized ? "text-white" : "text-white/40"
            }`}
          >
            {bar.value}
          </span>
          <div className="flex w-full flex-1 items-end">
            <div
              className={`w-full rounded-sm transition-[height] duration-1000 ease-out ${
                bar.emphasized ? "bg-white" : "bg-white/20"
              }`}
              style={{ height: active ? bar.height : "0%" }}
            />
          </div>
          <span
            className={`mt-3 text-center text-xs leading-snug ${
              bar.emphasized ? "text-white/70" : "text-white/35"
            }`}
          >
            {bar.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ImpactBento() {
  const sectionRef = useRef<HTMLElement>(null);
  const [chartsActive, setChartsActive] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setChartsActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setChartsActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.28 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      aria-labelledby="impact-bento-title"
      className="scroll-mt-20 bg-[#000000] text-white"
      id="impacto"
      ref={sectionRef}
    >
      <div className="mx-auto max-w-360 px-5 py-20 md:px-16 md:py-28">
        <header className="mb-10 max-w-2xl md:mb-14">
          <p className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-white/35 sm:text-xs">
            Impacto medible
          </p>
          <h2
            className="text-4xl font-semibold leading-[1.12] tracking-[-0.03em] text-white md:text-5xl md:leading-[1.08]"
            id="impact-bento-title"
          >
            Menos fricción en discovery. Más backlog listo para construir.
          </h2>
        </header>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-4">
          <BentoCard>
            <div className="mb-5 flex items-center gap-2.5">
              <TrendIcon />
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-white/40 sm:text-xs">
                Velocidad de planeación
              </p>
            </div>
            <h3 className="max-w-md text-[28px] font-semibold leading-snug tracking-[-0.02em] text-white sm:text-3xl">
              Backlogs que salen listos para construir.
            </h3>
            <p className="mt-5 max-w-md text-base leading-7 text-white/45 sm:text-lg sm:leading-8">
              Hasta 85% menos horas en descubrimiento y refinamiento, con historias, criterios y
              priorización exportables a GitHub.
            </p>
          </BentoCard>

          <BentoCard>
            <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-white/35 sm:text-xs">
              Horas de refinamiento por sprint
            </p>
            <HorizontalBars active={chartsActive} bars={planningBars} />
          </BentoCard>

          <BentoCard>
            <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-white/35 sm:text-xs">
              Historias listas para sprint
            </p>
            <VerticalBars active={chartsActive} bars={readinessBars} />
          </BentoCard>

          <BentoCard>
            <div className="mb-5 flex items-center gap-2.5">
              <ChecklistIcon />
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-white/40 sm:text-xs">
                Calidad del backlog
              </p>
            </div>
            <h3 className="max-w-md text-[28px] font-semibold leading-snug tracking-[-0.02em] text-white sm:text-3xl">
              Cada historia. Completa.
            </h3>
            <p className="mt-5 max-w-md text-base leading-7 text-white/45 sm:text-lg sm:leading-8">
              Criterios de aceptación, dependencias y story points quedan definidos antes de escribir
              código. Exporta a GitHub Issues cuando el equipo esté listo.
            </p>
            <p className="mt-auto pt-10 text-xs leading-5 text-white/25">
              Las cifras reflejan resultados típicos frente a planeación manual; el impacto varía según
              tamaño del equipo y madurez del proceso.
            </p>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
