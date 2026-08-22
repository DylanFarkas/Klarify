type PricingPlan = {
  name: string;
  price: string;
  projects: string;
  projectsLabel: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: "$0",
    projects: "1",
    projectsLabel: "Proyecto",
    features: [
      "Pipeline completo de descubrimiento",
      "Generación de backlog limitada en proyectos grandes",
      "Sin exportación a GitHub",
      "Sin herramientas de gestión",
    ],
    cta: "Empezar gratis",
    href: "/login",
  },
  {
    name: "Starter",
    price: "$5",
    projects: "3",
    projectsLabel: "Proyectos",
    features: [
      "Backlog ampliado con más detalle",
      "Carga de audio para capturar contexto",
      "Regeneración de resultados",
      "Gestión de proyectos dentro de Klarify",
      "Exportación manual",
    ],
    cta: "Elegir Starter",
    href: "/login",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$10",
    projects: "10",
    projectsLabel: "Proyectos",
    features: [
      "Backlog detallado y estructurado",
      "Gestión de proyectos dentro de Klarify",
      "Integración con GitHub",
      "Regeneración ilimitada",
      "Mayor capacidad de procesamiento con IA",
    ],
    cta: "Elegir Pro",
    href: "/login",
  },
];

function CheckIcon({ highlighted = false }: { highlighted?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`mt-0.5 h-4 w-4 shrink-0 ${
        highlighted ? "text-[#4d8fff]" : "text-white/35"
      }`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function MetricRow({
  value,
  label,
  highlighted = false,
}: {
  value: string;
  label: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-6 border-b py-5 ${
        highlighted ? "border-[#005bbf]/25" : "border-white/10"
      }`}
    >
      <span
        className={`tracking-[-0.04em] ${
          highlighted
            ? "text-4xl font-semibold text-white md:text-5xl"
            : "text-3xl font-semibold text-white md:text-4xl"
        }`}
      >
        {value}
      </span>
      <span className="shrink-0 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
        {label}
      </span>
    </div>
  );
}

function PlanCard({ plan }: { plan: PricingPlan }) {
  const isHighlighted = plan.highlighted;

  return (
    <article
      className={`flex h-full flex-col ${
        isHighlighted
          ? "rounded-4xl border border-[#005bbf]/30 bg-[#005bbf]/10 px-7 py-9 shadow-[0_24px_60px_rgba(0,91,191,0.18)] md:px-9 md:py-11"
          : "px-2 py-6 md:px-4 md:py-8"
      }`}
    >
      <h1
        className={`mb-8 text-2xl font-bold uppercase tracking-[0.2em] ${
          isHighlighted ? "text-[#4d8fff]" : "text-white/50"
        }`}
      >
        {plan.name}
      </h1>

      <div className="mb-8">
        <MetricRow highlighted={isHighlighted} label="Precio mensual" value={plan.price} />
        <MetricRow
          highlighted={isHighlighted}
          label={plan.projectsLabel}
          value={plan.projects}
        />
      </div>

      <ul className="mb-10 flex grow flex-col gap-3.5">
        {plan.features.map((feature) => (
          <li className="flex items-start gap-3 text-[15px] leading-6 text-white/70" key={feature}>
            <CheckIcon highlighted={isHighlighted} />
            {feature}
          </li>
        ))}
      </ul>

      <a
        className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all ${
          isHighlighted
            ? "bg-[#005bbf] text-white hover:bg-[#004da3]"
            : "border border-white/20 text-white hover:border-white/40 hover:bg-white/5"
        }`}
        href={plan.href}
      >
        {plan.cta}
        <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}

export function PricingPlans() {
  return (
    <section
      aria-labelledby="pricing-title"
      className="scroll-mt-20 bg-[#000000] px-5 py-24 md:px-16 md:py-32"
      id="pricing"
    >
      <div className="mx-auto max-w-360">
        <header className="mb-16 max-w-3xl md:mb-20">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
            Precios
          </p>
          <h2
            className="text-3xl font-semibold leading-[1.12] tracking-[-0.03em] text-white md:text-5xl md:leading-[1.08]"
            id="pricing-title"
          >
            Precios simples para equipos que quieren claridad desde el primer día
          </h2>
        </header>

        <div className="grid gap-6 md:grid-cols-3 md:items-stretch md:gap-10 lg:gap-14">
          {pricingPlans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>

        <p className="mt-12 flex items-center gap-2 text-sm text-white/45">
          <svg
            aria-hidden="true"
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 10v5M12 7h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
          Todos los precios en USD. Puedes cambiar de plan en cualquier momento.
        </p>
      </div>
    </section>
  );
}
