"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchWorkspace } from "@/lib/api-client";
import { useRouter } from "next/navigation";

const Beams = dynamic(() => import("@/components/landing/Beams"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black" aria-hidden="true" />,
});

const heroTitle = "Transforma ideas en backlogs ejecutables con agentes de IA";

export function HeroLanding() {
  const [typedLength, setTypedLength] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [beamsReady, setBeamsReady] = useState(false);
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
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(media.matches);

    const onChange = () => setReduceMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setBeamsReady(true);
      return;
    }

    const fadeTimer = window.setTimeout(() => setBeamsReady(true), 80);
    return () => window.clearTimeout(fadeTimer);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
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
  }, [typedLength, reduceMotion]);

  const typedTitle = useMemo(() => heroTitle.slice(0, typedLength), [typedLength]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        className={`pointer-events-none absolute inset-0 z-0 transition-opacity ease-out ${
          beamsReady ? "opacity-100" : "opacity-0"
        } ${reduceMotion ? "duration-0" : "duration-[2.2s]"}`}
        aria-hidden="true"
      >
        <Beams
          beamWidth={2}
          beamHeight={15}
          beamNumber={12}
          lightColor="#ffffff"
          speed={reduceMotion ? 0 : 2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={30}
        />
      </div>

      {/* Soft vignette so copy stays readable without hiding the beams */}
      <div
        className={`pointer-events-none absolute inset-0 z-1 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_45%,transparent_70%)] transition-opacity ease-out ${
          beamsReady ? "opacity-100" : "opacity-0"
        } ${reduceMotion ? "duration-0" : "duration-[2.2s]"}`}
        aria-hidden="true"
      />

      <main className="relative z-10 overflow-hidden">
        <section className="relative mx-auto max-w-360 px-5 pb-24 pt-10 text-center md:px-16 md:pt-22">
          <div className="relative z-10 mb-4 flex justify-center pb-5">
            <div>
              <span className="h-2 w-2 rounded-full" />
              <span
                className={`inline-block text-2xl transition-all duration-700 ${
                  showContent ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
              >
                Klarify
              </span>
            </div>
          </div>

          <h1 className="relative z-10 mx-auto mb-8 min-h-42 max-w-7xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-white md:min-h-54 md:text-6xl md:leading-[1.12] lg:text-8xl">
            {typedTitle}
            <span className="typewriter-caret" aria-hidden="true" />
          </h1>

          <div
            className={`transition-all duration-700 ${
              showContent ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            {showContent ? (
              <>
                <p className="mx-auto mb-12 max-w-2xl text-base leading-7 text-white/55 md:text-lg">
                  Klarify coordina multiples agentes inteligentes para automatizar el
                  descubrimiento y la planeacion de tus proyectos de software, eliminando la
                  friccion administrativa de raiz.
                </p>

                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <button
                    onClick={handleStartClick}
                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-[#0A0A0A] shadow-xl transition-transform hover:-translate-y-0.5"
                  >
                    Empezar gratis
                  </button>
                  <button
                    onClick={handleStartClick}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-transparent px-8 py-4 font-bold text-white transition-colors hover:bg-white/10"
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
