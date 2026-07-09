"use client";

import { useEffect, useState } from "react";

const ROTATION_MS = 5000;

const features = [
  {
    title: "Captura el contexto",
    description:
      "Reune notas, objetivos y restricciones iniciales para que el equipo no empiece desde una pagina en blanco.",
  },
  {
    title: "Alinea el alcance",
    description:
      "Los agentes detectan vacios, hacen preguntas clave y convierten contexto disperso en decisiones claras.",
  },
  {
    title: "Genera el backlog",
    description:
      "Produce historias de usuario, criterios de aceptacion y estructura jerarquica lista para revisar y ajustar.",
  },
  {
    title: "Estima y prioriza",
    description:
      "Consolida story points, detecta dependencias y ordena el trabajo por valor e impacto para el equipo.",
  },
  {
    title: "Exporta a ejecucion",
    description:
      "Lleva issues, etiquetas y criterios directamente a GitHub o tu tracker preferido con un solo clic.",
  },
];

export function ProductDemoVideo() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % features.length);
    }, ROTATION_MS);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      aria-labelledby="product-demo-title"
      className="bg-black px-5 py-24 text-white md:px-16 md:py-32"
      id="producto"
    >
      <div className="mx-auto grid max-w-360 items-start gap-16 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14 xl:gap-20">
        <div>
          <h2
            id="product-demo-title"
            className="max-w-xl text-4xl font-light leading-[1.08] tracking-[-0.04em] text-white md:text-6xl lg:text-7xl"
          >
            Del ruido al backlog ejecutable
          </h2>

          <ol
            aria-label="Capacidades de Klarify"
            className="relative mt-14 space-y-0"
          >
            <span
              aria-hidden="true"
              className="absolute bottom-3 left-[5px] top-3 w-px bg-white/15"
            />

            {features.map((feature, index) => {
              const isActive = index === activeIndex;

              return (
                <li
                  className="relative pl-8"
                  key={feature.title}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-[0.55rem] h-[11px] w-[11px] border transition-all duration-500 ${
                      isActive
                        ? "border-white bg-white"
                        : "border-white/25 bg-transparent"
                    }`}
                  />

                  <button
                    aria-current={isActive ? "step" : undefined}
                    className="group w-full py-4 text-left"
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  >
                    <span
                      className={`block text-lg font-medium transition-colors duration-500 md:text-xl ${
                        isActive ? "text-white" : "text-white/30"
                      }`}
                    >
                      {feature.title}
                    </span>

                    {isActive ? (
                      <div className="h-19 overflow-hidden pt-2 md:h-22">
                        <p className="text-sm leading-6 text-white/50 md:text-base md:leading-7">
                          {feature.description}
                        </p>
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-white/12 bg-[#0a0a0a] shadow-[0_40px_120px_rgba(0,0,0,0.75)] lg:rounded-3xl">
          <div className="flex items-center gap-4 border-b border-white/8 bg-[#141414] px-5 py-3.5 lg:px-6 lg:py-4">
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex flex-1 justify-center">
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-white/45">
                <svg
                  aria-hidden="true"
                  className="h-3 w-3 text-white/35"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M7 11V7a5 5 0 0 1 10 0v4M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.6}
                  />
                </svg>
                klarify.app
              </div>
            </div>
          </div>

          <video
            autoPlay
            className="block h-auto w-full"
            loop
            muted
            playsInline
            poster="/videos/klarify-demo-poster.jpg"
            src="/videos/klarify-demo.mp4"
          />
        </div>
      </div>
    </section>
  );
}
