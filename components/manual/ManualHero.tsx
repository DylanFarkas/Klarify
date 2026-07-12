"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STEPS = [
  { num: "01", label: "Ingesta", detail: "Contexto" },
  { num: "02", label: "Backlog", detail: "Épicas y HU" },
  { num: "03", label: "Estimación", detail: "Story points" },
  { num: "04", label: "Priorización", detail: "Frameworks" },
  { num: "05", label: "Sprints", detail: "Plan" },
  { num: "06", label: "Ejecución", detail: "Dashboard · Kanban" },
] as const;

export function ManualHero() {
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveal = window.setTimeout(() => setReady(true), 40);

    if (reduce) {
      setActive(STEPS.length - 1);
      return () => window.clearTimeout(reveal);
    }

    let step = 0;
    const tick = window.setInterval(() => {
      step += 1;
      setActive(Math.min(step, STEPS.length - 1));
      if (step >= STEPS.length - 1) window.clearInterval(tick);
    }, 280);

    return () => {
      window.clearTimeout(reveal);
      window.clearInterval(tick);
    };
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Atmosphere: dual-scale blueprint grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(25, 28, 29, 0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(25, 28, 29, 0.055) 1px, transparent 1px),
            linear-gradient(rgba(25, 28, 29, 0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(25, 28, 29, 0.022) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px, 64px 64px, 16px 16px, 16px 16px",
          backgroundPosition: "-1px -1px",
          maskImage:
            "radial-gradient(ellipse 75% 70% at 50% 40%, #000 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 70% at 50% 40%, #000 20%, transparent 75%)",
        }}
      />

      <div className="relative z-10 mx-auto grid max-w-360 gap-12 px-5 pb-16 pt-14 md:px-16 md:pb-22 md:pt-18 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16 lg:pb-24 lg:pt-20">
        <div
          className={`transition-all duration-700 ${
            ready ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div className="mb-6 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 shrink-0 rounded-[5px] bg-[#005bbf]"
            />
            <span className="text-lg font-semibold tracking-[-0.02em] text-[#191c1d]">
              Klarify
            </span>
            <span className="text-[#191c1d]/25">·</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#191c1d]/45">
              Guía de uso
            </span>
          </div>

          <h1 className="max-w-xl text-4xl font-light leading-[1.06] tracking-[-0.04em] text-[#191c1d] md:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            Domina el pipeline,{" "}
            <span className="italic text-[#005bbf]">agente por agente</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-[#414754] md:text-lg md:leading-8">
            Una guía práctica para Product Owners y equipos: desde el primer proyecto
            hasta Dashboard, Kanban y exportación a GitHub.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#primer-proyecto"
              className="inline-flex items-center rounded-xl bg-[#191c1d] px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              Empezar la guía
            </a>
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl border border-[#191c1d]/12 bg-white/80 px-6 py-3.5 text-sm font-bold text-[#191c1d] backdrop-blur-sm transition-colors hover:bg-white"
            >
              Abrir Klarify
            </Link>
          </div>
        </div>

        {/* Signature: animated pipeline path */}
        <div
          className={`relative transition-all delay-150 duration-700 ${
            ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="rounded-3xl border border-[#191c1d]/10 bg-white/85 p-5 shadow-[0_24px_60px_rgba(25,28,29,0.06)] backdrop-blur-md md:p-7">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#005bbf]">
                  Flujo del producto
                </p>
                <p className="mt-1 text-sm text-[#5d616b]">
                  Idea → backlog ejecutable
                </p>
              </div>
              <p className="font-mono text-xs tabular-nums text-[#191c1d]/40">
                {String(Math.min(active + 1, STEPS.length)).padStart(2, "0")} /{" "}
                {String(STEPS.length).padStart(2, "0")}
              </p>
            </div>

            <ol className="space-y-0">
              {STEPS.map((step, index) => {
                const lit = index <= active;
                const current = index === active;

                return (
                  <li key={step.num} className="relative flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-500 ${
                          lit
                            ? "bg-[#005bbf] text-white"
                            : "bg-[#edf4ff] text-[#005bbf]/50"
                        } ${current ? "scale-110 ring-4 ring-[#005bbf]/15" : ""}`}
                      >
                        {step.num}
                      </span>
                      {index < STEPS.length - 1 ? (
                        <span
                          className={`my-1 w-px flex-1 min-h-4 transition-colors duration-500 ${
                            index < active ? "bg-[#005bbf]" : "bg-[#dfe3ec]"
                          }`}
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>

                    <div
                      className={`pb-5 pt-1 transition-opacity duration-500 ${
                        lit ? "opacity-100" : "opacity-40"
                      } ${index === STEPS.length - 1 ? "pb-0" : ""}`}
                    >
                      <p className="text-sm font-semibold tracking-[-0.01em] text-[#191c1d]">
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-xs text-[#5d616b]">{step.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
