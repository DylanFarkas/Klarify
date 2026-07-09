export function BacklogCta() {
  return (
    <section aria-labelledby="backlog-cta-title" className="bg-white px-5 pt-24 pb-12 md:px-16 md:pt-30 md:pb-16">
      <div className="relative mx-auto max-w-360 overflow-hidden rounded-4xl bg-[#191c1d] px-8 py-16 text-center text-white shadow-[0_30px_90px_rgba(25,28,29,0.18)] md:px-20 md:py-24">
        <div className="relative z-10">
          <h2
            className="mx-auto mb-8 max-w-4xl text-3xl font-bold leading-tight tracking-[-0.04em] text-white md:text-5xl"
            id="backlog-cta-title"
          >
            ¿Listo para clarificar tu backlog?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-base leading-7 text-white/65 md:text-lg">
            Únete a cientos de equipos que están enviando código de mejor calidad, más rápido y
            con menos fricción.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row sm:gap-6">
            <a
              className="rounded-xl bg-[#005bbf] px-10 py-5 text-lg font-bold text-white transition-transform hover:scale-105"
              href="#"
            >
              Empieza ahora gratis
            </a>
            <a
              className="rounded-xl border border-white/20 bg-white/10 px-10 py-5 text-lg font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              href="#"
            >
              Habla con nosotros
            </a>
          </div>
        </div>

        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#005bbf]/20 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#4d7cff]/20 blur-[100px]" />
      </div>
    </section>
  );
}