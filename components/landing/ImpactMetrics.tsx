"use client";

import { useEffect, useState } from "react";

const ROTATION_MS = 6000;
const FADE_MS = 180;

type ImpactSlide = {
  id: string;
  label: string;
  metric: string;
  title: string;
  description: string;
  chartIndex: number;
};

const impactSlides: ImpactSlide[] = [
  {
    id: "efficiency",
    label: "Eficiencia por historia",
    metric: "70%",
    title: "Menos costo por ítem del backlog",
    description:
      "La estructuración automática con story points y priorización elimina horas de trabajo repetitivo del Product Owner.",
    chartIndex: 0,
  },
  {
    id: "risk",
    label: "Reducción de riesgo",
    metric: "3×",
    title: "Menos sorpresas en ejecución",
    description:
      "Criterios de aceptación y dependencias detectadas temprano evitan ciclos de corrección costosos una vez iniciado el desarrollo.",
    chartIndex: 1,
  },
  {
    id: "velocity",
    label: "Velocidad de planeación",
    metric: "85%",
    title: "Menos horas en descubrimiento",
    description:
      "Equipos reducen drásticamente las reuniones de refinamiento y la documentación manual antes de escribir la primera línea de código.",
    chartIndex: 2,
  },
  {
    id: "roi",
    label: "Retorno de inversión",
    metric: "12×",
    title: "Recupera el costo desde el primer sprint",
    description:
      "Con planes desde $5/mes, un solo ciclo de planeación ahorrado supera ampliamente la inversión mensual del equipo.",
    chartIndex: 3,
  },
];

const VIEW_W = 1100;
const VIEW_H = 440;
const GRID_STEP_X = 500;
const GRID_STEP_Y = 410;

const linePoints = [
  { x: -30, y: 425 },
  { x: 60, y: 478 },
  { x: 130, y: 522 },
  { x: 215, y: 442 },
  { x: 455, y: 205 },
  { x: 545, y: 322 },
  { x: 645, y: 190 },
  { x: 650, y: 190 },
  { x: 735, y: 190 },
  { x: 780, y: 88 },
  { x: 1005, y: 88 },
  { x: 1105, y: 40 },
  { x: 1240, y: -20 },
];

const markerPoints = [
  linePoints[4],
  linePoints[6],
  linePoints[8],
  linePoints[9],
];

const mainLinePath = linePoints
  .slice(0, 11)
  .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
  .join(" ");

const tailLinePath = linePoints
  .slice(10)
  .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
  .join(" ");

const gridX = Array.from({ length: VIEW_W / GRID_STEP_X + 1 }, (_, index) => index * GRID_STEP_X);
const gridY = Array.from({ length: VIEW_H / GRID_STEP_Y + 1 }, (_, index) => index * GRID_STEP_Y);

function GridIntersection({ x, y }: { x: number; y: number }) {
  return <rect className="impact-metrics__grid-node" height="3" width="3" x={x - 1.5} y={y - 1.5} />;
}

function ChartMarker({
  x,
  y,
  active,
}: {
  x: number;
  y: number;
  active: boolean;
}) {
  if (!active) {
    return (
      <g>
        <rect
          className="impact-metrics__marker-idle-glow"
          filter="url(#impact-marker-bloom)"
          height="30"
          width="30"
          x={x - 15}
          y={y - 15}
        />
        <rect className="impact-metrics__marker-idle-halo" height="15" width="15" x={x - 7.5} y={y - 7.5} />
        <rect className="impact-metrics__marker-idle-core" height="7" width="7" x={x - 3.5} y={y - 3.5} />
      </g>
    );
  }

  return (
    <g>
      <rect
        className="impact-metrics__marker-bloom"
        filter="url(#impact-marker-bloom)"
        height="46"
        width="46"
        x={x - 23}
        y={y - 23}
      />
      <rect className="impact-metrics__marker-halo" height="22" width="22" x={x - 11} y={y - 11} />
      <rect
        className="impact-metrics__marker-ring"
        fill="none"
        height="16"
        strokeWidth="1"
        width="16"
        x={x - 8}
        y={y - 8}
      />
      <rect className="impact-metrics__marker-core" height="8" width="8" x={x - 4} y={y - 4} />
    </g>
  );
}

function ImpactChart({
  activeIndex,
}: {
  activeIndex: number;
}) {
  const activeSlide = impactSlides[activeIndex];
  const activePoint = markerPoints[activeSlide.chartIndex];
  const leaderStartX = Math.max(activePoint.x - 170, 250);

  return (
    <svg
      aria-hidden="true"
      className="impact-metrics__chart"
      preserveAspectRatio="xMidYMid slice"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
    >
      <defs>
        <filter height="220%" id="impact-marker-bloom" width="220%" x="-60%" y="-60%">
          <feGaussianBlur result="blur" stdDeviation="6" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="impact-line-fade" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.8)" />
        </linearGradient>
        <linearGradient id="impact-tail-fade" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
        </linearGradient>
      </defs>

      {gridX.map((x) => (
        <line
          className="impact-metrics__grid-line"
          key={`gx-${x}`}
          strokeDasharray="10 12"
          x1={x}
          x2={x}
          y1="0"
          y2={VIEW_H}
        />
      ))}
      {gridY.map((y) => (
        <line
          className="impact-metrics__grid-line"
          key={`gy-${y}`}
          strokeDasharray="10 12"
          x1="0"
          x2={VIEW_W}
          y1={y}
          y2={y}
        />
      ))}
      {gridX.map((x) => gridY.map((y) => <GridIntersection key={`node-${x}-${y}`} x={x} y={y} />))}

      <path className="impact-metrics__chart-line" d={mainLinePath} stroke="url(#impact-line-fade)" />
      <path className="impact-metrics__chart-line-tail" d={tailLinePath} stroke="url(#impact-tail-fade)" />

      <polyline
        className="impact-metrics__leader"
        fill="none"
        points={`${leaderStartX},${activePoint.y} ${activePoint.x},${activePoint.y}`}
      />
      <rect
        className="impact-metrics__leader-node"
        height="6"
        width="6"
        x={leaderStartX - 3}
        y={activePoint.y - 3}
      />

      {markerPoints.map((point, index) => (
        <ChartMarker
          active={index === activeSlide.chartIndex}
          key={`${point.x}-${point.y}`}
          x={point.x}
          y={point.y}
        />
      ))}
    </svg>
  );
}

export function ImpactMetrics() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const activeSlide = impactSlides[activeIndex];

  const transitionTo = (index: number) => {
    setIsTransitioning(true);
    window.setTimeout(() => {
      setActiveIndex(index);
      setIsTransitioning(false);
    }, FADE_MS);
  };

  const goToSlide = (index: number) => {
    if (index === activeIndex) {
      return;
    }
    transitionTo(index);
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsTransitioning(true);
      window.setTimeout(() => {
        setActiveIndex((current) => (current + 1) % impactSlides.length);
        setIsTransitioning(false);
      }, FADE_MS);
    }, ROTATION_MS);

    return () => window.clearTimeout(timeout);
  }, [activeIndex]);

  return (
    <section
      aria-labelledby="impact-metrics-title"
      className="impact-metrics relative overflow-hidden bg-[#050505] text-white"
      id="impacto"
    >
      <div className="relative min-h-screen mx-auto max-w-390 px-5 py-16 sm:py-20 md:px-16 md:py-24">
        <div className="relative min-h-[480px] sm:min-h-[520px] lg:min-h-[600px] xl:min-h-[660px]">
          <div className="impact-metrics__chart-wrap">
            <ImpactChart activeIndex={activeIndex} />
          </div>

          <article
            className={`impact-metrics__card relative z-10 w-full max-w-[360px] rounded-2xl border border-white/10 bg-[#131313]/90 p-6 backdrop-blur-md transition-all duration-300 sm:p-8 lg:absolute lg:left-0 lg:top-12 lg:p-10 ${
              isTransitioning ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
            }`}
          >
            <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-white/35 sm:mb-4 sm:text-[11px]">
              {activeSlide.label}
            </p>
            <p className="text-[52px] font-semibold leading-none tracking-tighter text-white sm:text-[64px]">
              {activeSlide.metric}
            </p>
            <h3 className="mb-3 mt-6 text-base font-semibold leading-snug text-white sm:mt-10">
              {activeSlide.title}
            </h3>
            <p className="text-sm leading-6 text-white/40">
              {activeSlide.description}
            </p>
          </article>

          <div className="relative z-10 mt-10 flex flex-col gap-8 sm:mt-12 sm:gap-10 lg:absolute lg:-left-16 lg:-right-16 lg:bottom-0 lg:mt-0 lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:px-16 xl:gap-10">
            <nav aria-label="Métricas de impacto" className="order-2 -mx-5 shrink-0 overflow-x-auto px-5 pb-0.5 lg:order-1 lg:mx-0 lg:overflow-visible lg:px-0">
              <ol className="flex w-max items-center gap-2.5 sm:gap-4">
                {impactSlides.map((slide, index) => {
                  const isActive = index === activeIndex;

                  return (
                    <li className="flex items-center gap-2.5 sm:gap-4" key={slide.id}>
                      <button
                        aria-current={isActive ? "true" : undefined}
                        className={`font-mono text-xs tabular-nums transition-colors duration-300 ${
                          isActive ? "text-white" : "text-white/30 hover:text-white/55"
                        }`}
                        onClick={() => goToSlide(index)}
                        type="button"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </button>
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className="relative h-[3px] w-10 overflow-hidden bg-white/12 sm:w-16 lg:w-20 xl:w-24"
                        >
                          <span
                            className="impact-metrics__progress-fill absolute inset-y-0 left-0 bg-white"
                            key={activeIndex}
                          />
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="order-1 w-full min-w-0 lg:order-2 lg:max-w-md lg:ml-auto lg:text-right xl:max-w-xl">
              <h2
                className="text-xl font-medium leading-snug tracking-[-0.01em] sm:text-2xl md:text-[26px] lg:text-[24px] xl:text-3xl"
                id="impact-metrics-title"
              >
                <span className="text-white">
                  Klarify estrucura tu backlog de principio a fin.
                </span>{" "}
                <span className="text-white/40">
                  Descubrimiento, historias de usuario y priorización listos para exportar a GitHub.
                </span>
              </h2>

              <div className="mt-6 sm:mt-8 lg:mt-10 lg:flex lg:flex-col lg:items-end">
                <p className="text-sm text-white/75">¿Quieres ver el impacto en tu próximo proyecto?</p>
                <a
                  className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/55 underline underline-offset-4 transition-colors hover:text-white"
                  href="/login"
                >
                  Empieza con un proyecto gratis
                  <span aria-hidden="true">↘</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
