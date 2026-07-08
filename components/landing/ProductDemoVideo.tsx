export function ProductDemoVideo() {
  return (
    <section
      aria-labelledby="product-demo-title"
      className="bg-white px-5 pb-24 pt-4 md:px-16 md:pb-32"
    >
      <div className="mx-auto max-w-360">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#005bbf]">
            Klarify en video
          </p>
          <h2
            id="product-demo-title"
            className="text-3xl leading-tight tracking-[-0.03em] text-[#191c1d] md:text-5xl"
          >
            Mira a Klarify convertir una idea en un{" "}
            <span className="italic text-[#005bbf]">backlog ejecutable</span>
          </h2>
          <p className="mt-6 text-base leading-7 text-[#414754] md:text-lg">
            Del primer prompt al tablero de ejecucion: asi es todo el flujo de agentes de IA de
            Klarify, de principio a fin.
          </p>
        </div>

        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#dfe3ec] bg-white shadow-[0_30px_80px_rgba(25,28,29,0.12)]">
          <div className="flex items-center gap-4 border-b border-[#dfe3ec] bg-[#f6f7f9] px-5 py-3.5">
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex flex-1 justify-center">
              <div className="flex items-center gap-2 rounded-md bg-white px-4 py-1.5 text-xs font-medium text-[#5d616b] shadow-[0_1px_2px_rgba(25,28,29,0.08)]">
                <svg aria-hidden="true" className="h-3 w-3 text-[#8a8f99]" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M7 11V7a5 5 0 0 1 10 0v4M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                klarify.app
              </div>
            </div>
          </div>

          <video
            autoPlay
            className="block h-auto w-full"
            loop
            muted
            playsInline
            poster="/videos/klarify-demo-poster.jpg"
            src="/videos/klarify-demo.mp4"
          />
        </div>
      </div>
    </section>
  );
}
