"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchWorkspace } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { HeroPerspectiveGrid } from "@/components/landing/HeroPerspectiveGrid";

const titleStart = "Transforma ideas en ";
const titleHighlight = "backlogs ejecutables";
const titleEnd = " con agentes de IA";
const heroTitle = `${titleStart}${titleHighlight}${titleEnd}`;

export function HeroLanding() {
  const [typedLength, setTypedLength] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleStartClick = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      const { preferences } = await fetchWorkspace(user);
      router.push(`/agentes/${preferences.lastAgent || "1"}`);
    } catch {
      router.push("/agentes/1");
    }
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      const revealTimer = window.setTimeout(() => {
        setTypedLength(heroTitle.length);
        setShowContent(true);
      }, 0);

      return () => window.clearTimeout(revealTimer);
    }

    if (typedLength >= heroTitle.length) {
      const revealTimer = window.setTimeout(() => setShowContent(true), 700);
      return () => window.clearTimeout(revealTimer);
    }

    const typingTimer = window.setTimeout(() => {
      setTypedLength((currentLength) => currentLength + 1);
    }, 40);

    return () => window.clearTimeout(typingTimer);
  }, [typedLength]);

  const titleParts = useMemo(() => {
    const start = heroTitle.slice(0, Math.min(typedLength, titleStart.length));
    const highlightStart = titleStart.length;
    const highlightEnd = highlightStart + titleHighlight.length;
    const highlight = heroTitle.slice(
      highlightStart,
      Math.min(Math.max(typedLength, highlightStart), highlightEnd),
    );
    const end = heroTitle.slice(highlightEnd, Math.max(typedLength, highlightEnd));

    return { start, highlight, end };
  }, [typedLength]);

  return (
    <div className="relative min-h-screen bg-white text-[#191c1d]">
      <HeroPerspectiveGrid />
      <main className="relative z-10 overflow-hidden">
        <section className="relative mx-auto max-w-360 px-5 pb-24 pt-10 text-center md:px-16 md:pt-22">
          <div className="relative z-10 mb-4 pb-5 flex justify-center">
            <div>
              <span className="h-2 w-2 rounded-full" />
              <span
                className={`inline-block transition-all duration-700 text-2xl ${
                  showContent ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
              >
                Klarify
              </span>
            </div>
          </div>

          <h1 className="relative z-10 mx-auto mb-8 min-h-42 max-w-7xl text-4xl leading-tight tracking-[-0.04em] text-[#191c1d] md:min-h-54 md:text-6xl md:leading-[1.12] lg:text-8xl">
            {titleParts.start}
            <span className="italic text-[#005bbf]">{titleParts.highlight}</span>
            {titleParts.end}
            <span className="typewriter-caret" aria-hidden="true" />
          </h1>

          <div
            className={`transition-all duration-700 ${
              showContent ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            {showContent ? (
              <>
                <p className="mx-auto mb-12 max-w-2xl text-base leading-7 text-[#414754] md:text-lg">
                  Klarify coordina multiples agentes inteligentes para automatizar el
                  descubrimiento y la planeacion de tus proyectos de software, eliminando la
                  friccion administrativa de raiz.
                </p>

                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <button
                    onClick={handleStartClick}
                    className="flex items-center gap-2 rounded-xl bg-[#191c1d] px-8 py-4 font-bold text-white shadow-xl transition-transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    Empezar gratis
                  </button>
                  <button
                    onClick={handleStartClick}
                    className="flex items-center gap-2 rounded-xl border border-[#c1c6d6]/50 bg-white px-8 py-4 font-bold text-[#191c1d] transition-colors hover:bg-[#edeeef] cursor-pointer"
                  >
                    Ver agentes en acción
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}