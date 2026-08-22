"use client";

import { useEffect, useRef, useState } from "react";
import type { DemoView } from "./demo-data";
import { DEMO_VIEW_ORDER } from "./demo-data";
import { DemoWorkspaceFrame } from "./DemoWorkspaceFrame";

const ROTATION_MS = 11000;

export function WorkspaceProductDemo() {
  const [activeView, setActiveView] = useState<DemoView>("projects");
  const [klarkOpen, setKlarkOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const inViewRef = useRef(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || paused) return;

    const interval = window.setInterval(() => {
      if (!inViewRef.current) return;
      setActiveView((current) => {
        const index = DEMO_VIEW_ORDER.indexOf(current);
        const next = DEMO_VIEW_ORDER[(index + 1) % DEMO_VIEW_ORDER.length];
        setKlarkOpen(next === "stack");
        return next;
      });
    }, ROTATION_MS);

    return () => window.clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    if (activeView === "projects" || activeView === "board") {
      setKlarkOpen(false);
    }
  }, [activeView]);

  return (
    <section
      ref={sectionRef}
      id="producto"
      className="scroll-mt-20 bg-[#000000] px-5 py-24 md:px-16 md:py-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-360">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
            Producto
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white md:text-5xl">
            El workspace donde tus agentes ejecutan
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/50 md:text-lg">
            Proyectos, backlog, stack y tablero en un solo lugar. Explora la demo interactiva.
          </p>
        </div>

        <div className="mt-12 md:mt-16">
          <DemoWorkspaceFrame
            activeView={activeView}
            klarkOpen={klarkOpen}
            onNavigate={setActiveView}
            onOpenKlark={() => setKlarkOpen(true)}
            onCloseKlark={() => setKlarkOpen(false)}
            onUserInteract={() => setPaused(true)}
          />
        </div>

        <div className="mt-6 flex justify-center gap-2" aria-hidden>
          {DEMO_VIEW_ORDER.map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => {
                setPaused(true);
                setActiveView(view);
                setKlarkOpen(view === "stack");
              }}
              className={[
                "h-1.5 rounded-full transition-all",
                activeView === view ? "w-8 bg-white" : "w-1.5 bg-white/25 hover:bg-white/45",
              ].join(" ")}
              aria-label={`Ver ${view}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
