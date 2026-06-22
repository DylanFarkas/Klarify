const pricingPlans = [
  {
    name: "Starter",
    price: "$0",
    period: "/mes",
    features: ["5 Proyectos", "Agente Descubridor básico", "Exportación Manual"],
    cta: "Empezar gratis",
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mes",
    features: [
      "Proyectos Ilimitados",
      "Agentes Ilimitados",
      "GitHub Export",
      "Human-in-the-loop validation",
    ],
    cta: "Prueba 14 días",
    highlighted: true,
    badge: "Recomendado",
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: [
      "SSO & Seguridad Avanzada",
      "Agentes personalizados",
      "Integración Jira On-Premise",
      "Account Manager",
    ],
    cta: "Contactar ventas",
  },
];

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-[#005bbf]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

export function PricingPlans() {
  return (
    <section aria-labelledby="pricing-title" className="bg-white px-5 py-24 md:px-16 md:py-30" id="pricing">
      <div className="mx-auto max-w-360 text-center">
        <h2
          className="mb-4 text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#191c1d] md:text-5xl"
          id="pricing-title"
        >
          Planes para cada etapa
        </h2>
        <p className="mx-auto max-w-2xl text-base leading-7 text-[#5d616b] md:text-lg">
          Escala tu equipo de desarrollo con inteligencia.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-360 gap-8 md:grid-cols-3 md:items-start">
        {pricingPlans.map((plan) => (
          <article
            className={`relative flex h-full flex-col rounded-3xl p-8 transition-all ${
              plan.highlighted
                ? "border-2 border-[#005bbf] bg-white shadow-[0_24px_70px_rgba(0,91,191,0.16)] md:-translate-y-4"
                : "border border-[#dfe3ec] bg-white"
            }`}
            key={plan.name}
          >
            {plan.badge ? (
              <div className="absolute right-8 top-0 -translate-y-1/2 rounded-full bg-[#005bbf] px-4 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                {plan.badge}
              </div>
            ) : null}

            <h3 className="mb-2 text-lg font-bold text-[#191c1d]">{plan.name}</h3>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-[-0.03em] text-[#191c1d]">
                {plan.price}
              </span>
              {plan.period ? <span className="text-[#5d616b]">{plan.period}</span> : null}
            </div>

            <ul className="mb-10 flex grow flex-col gap-4">
              {plan.features.map((feature) => (
                <li
                  className={`flex items-center gap-3 text-sm text-[#191c1d] ${
                    plan.highlighted && feature === "Agentes Ilimitados" ? "font-bold" : ""
                  }`}
                  key={feature}
                >
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>

            <a
              className={`mt-auto flex w-full items-center justify-center rounded-xl py-3 font-bold transition-all ${
                plan.highlighted
                  ? "bg-[#005bbf] text-white shadow-md hover:opacity-90"
                  : "border border-[#191c1d] text-[#191c1d] hover:bg-[#edeeef]"
              }`}
              href={plan.name === "Enterprise" ? "#" : "/login"}
            >
              {plan.cta}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}