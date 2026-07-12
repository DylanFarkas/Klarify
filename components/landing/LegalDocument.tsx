import Link from "next/link";
import type { ReactNode } from "react";
import { Navbar } from "@/components/landing/Navbar/Navbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  summary: string;
  updatedAt: string;
  sections: LegalSection[];
  alternate: {
    label: string;
    href: string;
  };
};

export function LegalDocument({
  eyebrow,
  title,
  summary,
  updatedAt,
  sections,
  alternate,
}: LegalDocumentProps) {
  return (
    <>
      <Navbar />

      <main className="bg-white text-[#191c1d]">
        <section className="relative overflow-hidden">
          {/* Atmosphere: dual-scale blueprint grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(25, 28, 29, 0.055) 1px, transparent 1px),
                linear-gradient(90deg, rgba(25, 28, 29, 0.055) 1px, transparent 1px),
                linear-gradient(rgba(25, 28, 29, 0.022) 1px, transparent 1px),
                linear-gradient(90deg, rgba(25, 28, 29, 0.022) 1px, transparent 1px)
              `,
              backgroundSize: "64px 64px, 64px 64px, 16px 16px, 16px 16px",
              backgroundPosition: "-1px -1px",
              maskImage:
                "radial-gradient(ellipse 75% 70% at 50% 40%, #000 20%, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 75% 70% at 50% 40%, #000 20%, transparent 75%)",
            }}
          />

          <div className="relative z-10 mx-auto max-w-360 px-5 pb-14 pt-14 md:px-16 md:pb-18 md:pt-18">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-5 w-5 shrink-0 rounded-[5px] bg-[#005bbf]"
              />
              <span className="text-lg font-semibold tracking-[-0.02em] text-[#191c1d]">
                Klarify
              </span>
              <span className="text-[#191c1d]/25">·</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#191c1d]/45">
                {eyebrow}
              </span>
            </div>

            <h1 className="max-w-3xl text-4xl font-light leading-[1.06] tracking-[-0.04em] text-[#191c1d] md:text-5xl md:leading-[1.05]">
              {title}
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-[#414754] md:text-lg md:leading-8">
              {summary}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[#5d616b]">
              <p>
                Última actualización:{" "}
                <time className="font-medium text-[#191c1d]" dateTime="2026-07-11">
                  {updatedAt}
                </time>
              </p>
              <Link
                className="font-medium text-[#005bbf] underline-offset-4 transition-colors hover:underline"
                href={alternate.href}
              >
                {alternate.label}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-360 px-5 py-14 md:px-16 md:py-20">
          <div className="grid gap-14 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[240px_minmax(0,42rem)]">
            <aside className="hidden lg:block">
              <nav
                aria-label="Secciones del documento"
                className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2"
              >
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#5d616b]">
                  Contenido
                </p>
                <ul className="space-y-1 border-l border-[#191c1d]/10">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        className="block border-l-2 border-transparent py-1.5 pl-4 text-sm text-[#5d616b] transition-colors hover:border-[#005bbf]/40 hover:text-[#191c1d]"
                        href={`#${section.id}`}
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <div className="space-y-12 md:space-y-14">
              {sections.map((section, index) => (
                <article className="scroll-mt-28" id={section.id} key={section.id}>
                  <header className="mb-5 border-b border-gray-300 pb-4">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#005bbf]">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#191c1d] md:text-[1.75rem]">
                      {section.title}
                    </h2>
                  </header>
                  <div className="space-y-4 text-[15px] leading-7 text-[#414754] md:text-base md:leading-8">
                    {section.content}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </>
  );
}
