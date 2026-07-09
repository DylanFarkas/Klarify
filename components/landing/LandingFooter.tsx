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
      { label: "Cómo funciona", href: "#producto" },
      { label: "Precios", href: "#pricing" },
      { label: "Impacto", href: "#impacto" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Blog", href: "#" },
      { label: "Carreras", href: "#" },
      { label: "Soporte", href: "#" },
    ],
  },
  {
    title: "Social",
    links: [
      { label: "X / Twitter", href: "https://x.com" },
      { label: "LinkedIn", href: "https://linkedin.com" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidad", href: "#" },
      { label: "Términos", href: "#" },
    ],
  },
];

function KlarifyMark() {
  return (
    <span aria-hidden="true" className="inline-flex h-5 w-5 shrink-0 rounded-[5px] bg-[#005bbf]" />
  );
}

function FooterLinkColumn({ column }: { column: FooterColumn }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold tracking-[-0.01em] text-white/90">
        {column.title}
      </h3>
      <ul className="space-y-3">
        {column.links.map((link) => (
          <li key={link.label}>
            <a
              className="text-sm text-white/50 transition-colors hover:text-white/85"
              href={link.href}
              {...(link.href.startsWith("http") ? { rel: "noopener noreferrer", target: "_blank" } : {})}
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
    <footer className="landing-footer relative min-h-[560px] overflow-hidden bg-[#0a0b0c] text-white md:min-h-[680px] lg:min-h-[780px]">
      <div className="relative z-10 mx-auto max-w-360 px-5 pb-52 pt-20 md:px-16 md:pb-64 md:pt-28 lg:pb-72">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)] lg:gap-20 xl:gap-28">
          <div className="max-w-sm">
            <a className="inline-flex items-center gap-2.5" href="/">
              <KlarifyMark />
              <span className="text-xl font-extrabold tracking-tight text-white">Klarify</span>
            </a>
            <p className="mt-6 text-[15px] leading-7 text-white/50">
              Klarify ayuda a equipos de producto a transformar ideas dispersas en backlogs
              ejecutables con agentes de IA: historias, criterios de aceptación, story points y
              priorización listos para exportar.
            </p>
            <p className="mt-8 text-sm text-white/35">Klarify © {year}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 sm:gap-x-6">
            {footerColumns.map((column) => (
              <FooterLinkColumn column={column} key={column.title} />
            ))}
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="landing-footer__watermark pointer-events-none select-none mb-20">
        <span>KLARIFY</span>
      </div>
    </footer>
  );
}
