"use client";

import { useId, useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    question: "¿Qué es Klarify y para quién está pensado?",
    answer:
      "Klarify es una plataforma con agentes de IA que convierte ideas dispersas en backlogs ejecutables: historias de usuario, criterios de aceptación, story points y priorización. Está pensada para Product Owners, equipos de producto y startups que quieren reducir horas de descubrimiento y refinamiento manual.",
  },
  {
    question: "¿Cómo funciona el pipeline de agentes?",
    answer:
      "El flujo avanza por etapas: captura de contexto y descubrimiento, generación del backlog, estimación con story points, priorización y planificación de sprints. Cada fase se revisa y aprueba antes de continuar, para que el equipo mantenga el control sobre el resultado final.",
  },
  {
    question: "¿Puedo empezar sin pagar?",
    answer:
      "Sí. El plan Free incluye un proyecto con acceso completo al pipeline de descubrimiento. Es ideal para probar Klarify con un caso real antes de escalar a más proyectos o funciones avanzadas.",
  },
  {
    question: "¿Puedo cambiar de plan en cualquier momento?",
    answer:
      "Sí. Puedes subir o bajar de plan cuando lo necesites. Los precios están en USD y se adaptan a la cantidad de proyectos que quieras gestionar dentro de la plataforma.",
  },
  {
    question: "¿Se integra con GitHub?",
    answer:
      "Sí. El plan Pro incluye exportación directa a GitHub Issues con historias, etiquetas y criterios de aceptación. Los planes Free y Starter permiten exportación manual del backlog generado.",
  },
  {
    question: "¿Qué tan seguros están mis datos?",
    answer:
      "Tu información de proyectos se almacena de forma segura y solo tú controlas el acceso a cada workspace. Las integraciones externas, como GitHub, requieren autorización explícita y puedes revocarlas cuando quieras.",
  },
  {
    question: "¿Cuántos proyectos puedo gestionar?",
    answer:
      "Depende del plan: Free incluye 1 proyecto, Starter hasta 3 y Pro hasta 10. Si necesitas más capacidad o funciones personalizadas para tu organización, contáctanos y te ayudamos a encontrar la mejor opción.",
  },
];

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-[#191c1d]/45 transition-transform duration-300 ${
        expanded ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function FaqAccordionItem({
  item,
  index,
  isOpen,
  onToggle,
  baseId,
}: {
  item: FaqItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  baseId: string;
}) {
  const buttonId = `${baseId}-button-${index}`;
  const panelId = `${baseId}-panel-${index}`;

  return (
    <div className="border-t border-[#191c1d]/10 last:border-b">
      <h3>
        <button
          aria-controls={panelId}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-[#191c1d]/80 md:py-7"
          id={buttonId}
          onClick={onToggle}
          type="button"
        >
          <span className="text-base font-semibold leading-snug tracking-[-0.01em] text-[#191c1d] md:text-[17px]">
            {item.question}
          </span>
          <ChevronIcon expanded={isOpen} />
        </button>
      </h3>

      <div
        aria-hidden={!isOpen}
        aria-labelledby={buttonId}
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        id={panelId}
        role="region"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="pb-6 pr-8 text-[15px] leading-7 text-[#191c1d]/70 md:pb-7 md:pr-12">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <section
      aria-labelledby="faq-title"
      className="scroll-mt-20 bg-white px-5 py-24 md:px-16 md:py-32"
      id="faq"
    >
      <div className="mx-auto max-w-360">
        <header className="mb-14 text-center md:mb-20">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.22em] text-[#191c1d]/45">
            FAQ
          </p>
          <h2
            className="text-3xl font-light leading-[1.12] tracking-[-0.03em] text-[#191c1d] md:text-5xl md:leading-[1.08]"
            id="faq-title"
          >
            Preguntas frecuentes
          </h2>
        </header>

        <div className="mx-auto max-w-3xl">
          {faqItems.map((item, index) => (
            <FaqAccordionItem
              baseId={baseId}
              index={index}
              isOpen={openIndex === index}
              item={item}
              key={item.question}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
