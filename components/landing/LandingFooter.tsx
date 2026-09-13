"use client";

type FooterLink = {
  label: string;
  href: string;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const footerColumns: FooterColumn[] = [
  {
    title: "Producto",
    links: [
      { label: "Cómo funciona", href: "/#producto" },
      { label: "Precios", href: "/#pricing" },
      { label: "Impacto", href: "/#impacto" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Manual de uso", href: "/manual" },
      { label: "Iniciar sesión", href: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos de servicio", href: "/terminos" },
      { label: "Política de privacidad", href: "/privacidad" },
    ],
  },
];

function FooterLinkColumn({ column }: { column: FooterColumn }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold tracking-[-0.01em] text-white">
        {column.title}
      </h3>
      <ul className="space-y-3">
        {column.links.map((link) => (
          <li key={link.label}>
            <a
              className="text-sm text-white/55 transition-colors hover:text-white"
              href={link.href}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer relative overflow-x-clip bg-[#000000] text-white">
      <div className="relative z-10 mx-auto max-w-360 px-5 pt-16 md:px-16 md:pt-24">
        {/* Headline */}
        <div className="border-b border-white/15 pb-12 md:pb-16">
          <h2 className="max-w-3xl text-3xl font-bold leading-[1.15] tracking-[-0.04em] text-white md:text-5xl lg:text-[3.25rem]">
            Ideas claras.
            <br />
            Backlogs listos para construir.
          </h2>
        </div>

        {/* Newsletter + nav */}
        <div className="grid gap-12 border-b border-white/15 py-12 md:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)] lg:gap-0">
          <div className="lg:border-r lg:border-white/15 lg:pr-12 xl:pr-16">
            <p className="mb-5 max-w-xs text-sm font-semibold leading-snug tracking-[-0.01em] text-white md:text-[15px]">
              Mantente al día con novedades del producto.
            </p>
            <form
              className="flex max-w-md"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <label className="sr-only" htmlFor="footer-email">
                Correo electrónico
              </label>
              <input
                className="min-w-0 flex-1 border border-white/25 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/50"
                id="footer-email"
                name="email"
                placeholder="Introduce tu correo electrónico"
                type="email"
                autoComplete="email"
                required
              />
              <button
                aria-label="Suscribirse"
                className="flex size-11.5 shrink-0 items-center justify-center border border-l-0 border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
                type="submit"
              >
                <svg
                  aria-hidden="true"
                  className="size-4"
                  fill="none"
                  viewBox="0 0 16 16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </form>
            <p className="mt-4 max-w-sm text-[11px] leading-relaxed text-white/40 italic">
              *Al completar este formulario te suscribes a nuestros correos y puedes
              darte de baja en cualquier momento.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:pl-12 xl:pl-16">
            {footerColumns.map((column) => (
              <FooterLinkColumn column={column} key={column.title} />
            ))}
          </div>
        </div>

        {/* Brand + legal */}
        <div className="pt-10 pb-6 md:pt-14 md:pb-8">
          <div
            aria-hidden="true"
            className="landing-footer__watermark pointer-events-none select-none"
          >
            <span>KLARIFY</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-white/45 md:mt-5 md:text-sm">
            <span>©{year} Klarify</span>
            <span aria-hidden="true" className="text-white/25">
              •
            </span>
            <a className="transition-colors hover:text-white/75" href="/privacidad">
              Política de privacidad
            </a>
            <span aria-hidden="true" className="text-white/25">
              •
            </span>
            <a className="transition-colors hover:text-white/75" href="/terminos">
              Términos de servicio
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
