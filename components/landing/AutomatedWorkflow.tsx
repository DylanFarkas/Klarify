export function AutomatedWorkflow() {
  return (
    <section
      aria-labelledby="automated-workflow-title"
      className="bg-[#000000] px-5 py-30 text-white md:px-8"
    >
      <div className="mx-auto flex max-w-360 flex-col items-center text-center">
        <svg
          aria-hidden="true"
          className="mb-6 h-12 w-12 text-white"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="m9 18-6-6 6-6M15 6l6 6-6 6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>

        <h2
          id="automated-workflow-title"
          className="mb-6 max-w-3xl text-3xl font-bold leading-tight tracking-[-0.03em] text-white md:text-5xl"
        >
          Tu flujo de trabajo, automatizado
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-base leading-7 text-white/60 md:text-lg">
          Exporta backlogs completos, historias de usuario estructuradas y criterios de
          aceptacion directamente a GitHub Issues o tu tracker preferido con un solo clic.
        </p>

        <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-white/5 p-8 text-left shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#191c1d]">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 fill-current"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Exportando a /org/project-repo
                </p>
                <p className="mt-1 text-sm text-white/55">
                  12 issues generados - Etiquetas: enhancement, AI
                </p>
              </div>
            </div>

            <div className="shrink-0 text-[#b7c4ff]">
              <svg
                aria-hidden="true"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="m5 13 4 4L19 7"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
