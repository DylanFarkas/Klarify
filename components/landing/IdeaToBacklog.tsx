"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const titleStart = "De la idea al ";
const titleHighlight = "backlog";
const titleEnd = " en minutos, no dias";
const ideaTitle = `${titleStart}${titleHighlight}${titleEnd}`;
const typingStartDelay = 100;

const backlogBenefits = [
  {
    metric: "01",
    title: "Captura la idea",
    description:
      "Reune notas, objetivos y restricciones iniciales para que el equipo no empiece desde una pagina en blanco.",
  },
  {
    metric: "02",
    title: "Alinea el alcance",
    description:
      "Los agentes detectan vacios, hacen preguntas clave y convierten contexto disperso en decisiones claras.",
  },
  {
    metric: "03",
    title: "Entrega backlog listo",
    description:
      "Genera historias, criterios de aceptacion y prioridades preparadas para revisar, ajustar y ejecutar.",
  },
];

export function IdeaToBacklog() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isSectionVisible, setIsSectionVisible] = useState(false);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const [typedLength, setTypedLength] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsSectionVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -15% 0px",
        threshold: 0.3,
      },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isSectionVisible || hasStartedTyping) {
      return;
    }

    const startTimer = window.setTimeout(() => {
      setHasStartedTyping(true);
    }, typingStartDelay);

    return () => window.clearTimeout(startTimer);
  }, [hasStartedTyping, isSectionVisible]);

  useEffect(() => {
    if (!hasStartedTyping) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      const revealTimer = window.setTimeout(() => {
        setTypedLength(ideaTitle.length);
        setShowContent(true);
      }, 0);

      return () => window.clearTimeout(revealTimer);
    }

    if (typedLength >= ideaTitle.length) {
      const revealTimer = window.setTimeout(() => setShowContent(true), 700);
      return () => window.clearTimeout(revealTimer);
    }

    const typingTimer = window.setTimeout(() => {
      setTypedLength((currentLength) => currentLength + 1);
    }, 40);

    return () => window.clearTimeout(typingTimer);
  }, [hasStartedTyping, typedLength]);

  const titleParts = useMemo(() => {
    const start = ideaTitle.slice(0, Math.min(typedLength, titleStart.length));
    const highlightStart = titleStart.length;
    const highlightEnd = highlightStart + titleHighlight.length;
    const highlight = ideaTitle.slice(
      highlightStart,
      Math.min(Math.max(typedLength, highlightStart), highlightEnd),
    );
    const end = ideaTitle.slice(highlightEnd, Math.max(typedLength, highlightEnd));

    return { start, highlight, end };
  }, [typedLength]);

  return (
    <section
      aria-labelledby="idea-to-backlog-title"
      className="bg-[#000000] px-5 pb-40 md:px-16 -mt-5 md:-mt-15"
      ref={sectionRef}
    >
      <div className="mx-auto grid max-w-360 gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p
            className={`mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#005bbf] transition-all duration-700 ${
              showContent ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            Klarify en accion
          </p>
          <h2
            id="idea-to-backlog-title"
            className="min-h-22 max-w-3xl text-3xl leading-tight tracking-[-0.03em] text-[#191c1d] md:min-h-32 md:text-5xl"
          >
            {titleParts.start}
            <span className="italic text-[#005bbf]">{titleParts.highlight}</span>
            {titleParts.end}
            <span className="typewriter-caret" aria-hidden="true" />
          </h2>
          <p
            className={`mt-6 max-w-2xl text-base leading-7 text-[#414754] transition-all duration-700 md:text-lg ${
              showContent ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            Convierte conversaciones, notas sueltas y objetivos de negocio en trabajo accionable
            para Product Owners, Scrum Masters y equipos de desarrollo.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {backlogBenefits.map((benefit, index) => (
              <article
                className={`rounded-3xl border border-[#dfe3ec] bg-white p-6 shadow-[0_18px_45px_rgba(25,28,29,0.06)] transition-all duration-700 ${
                  showContent ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
                key={benefit.metric}
                style={{ transitionDelay: showContent ? `${150 + index * 100}ms` : "0ms" }}
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#edf4ff] text-sm font-bold text-[#005bbf]">
                  {benefit.metric}
                </div>
                <h3 className="text-lg font-bold text-[#191c1d]">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5d616b]">{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>

        <figure
          className={`relative mx-auto flex w-full max-w-xl justify-center transition-all duration-700 lg:mr-0 lg:justify-end ${
            showContent ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
          style={{ transitionDelay: showContent ? "250ms" : "0ms" }}
        >
          <Image
            alt="Persona trabajando en un backlog digital"
            className="h-auto w-50 lg:w-500 object-contain"
            height={1024}
            priority={false}
            src="/image.png"
            width={862}
            loading="lazy"
          />
        </figure>
      </div>
    </section>
  );
}