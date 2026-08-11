"use client";

import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar/Navbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ManualSection } from "@/components/manual/ManualSection";
import { ManualStep } from "@/components/manual/ManualStep";
import { ManualCallout } from "@/components/manual/ManualCallout";
import { ManualHero } from "@/components/manual/ManualHero";

const TOC = [
  { id: "introduccion", label: "Introducción" },
  { id: "primer-proyecto", label: "Tu primer proyecto" },
  { id: "agente-1", label: "Ingesta de contexto" },
  { id: "agente-2", label: "Backlog inicial" },
  { id: "agente-3", label: "Estimación" },
  { id: "agente-4", label: "Priorización" },
  { id: "agente-5", label: "Planificación de sprints" },
  { id: "dashboard", label: "Dashboard" },
  { id: "kanban", label: "Tablero Kanban" },
  { id: "proyectos", label: "Gestión de proyectos" },
  { id: "configuracion", label: "Configuración" },
  { id: "consejos", label: "Buenas prácticas" },
] as const;

const CAPABILITIES = [
  "Capturar contexto desde texto, PDF o audio (según plan)",
  "Extraer deseos y generar épicas e historias de usuario",
  "Estimar story points con escala Fibonacci",
  "Priorizar con MoSCoW, WSJF, RICE o Valor/Esfuerzo",
  "Planificar sprints con objetivos y capacidad",
  "Seguir el progreso en Dashboard y Kanban",
  "Asignar miembros del equipo a historias",
  "Exportar el backlog a GitHub Issues (Pro)",
] as const;

const FRAMEWORKS = [
  {
    name: "MoSCoW",
    summary: "Must, Should, Could y Won't Have. Ideal para definir el alcance de un MVP.",
  },
  {
    name: "WSJF",
    summary: "Prioriza por costo de retraso dividido entre tamaño (Weighted Shortest Job First).",
  },
  {
    name: "RICE",
    summary: "Score = (Reach × Impact × Confidence) / Effort. Optimiza impacto con poco esfuerzo.",
  },
  {
    name: "Valor / Esfuerzo",
    summary: "Matriz 2×2: Quick Wins, Major Projects, Fill-in y Thankless.",
  },
] as const;

export default function ManualPage() {
  return (
    <>
      <Navbar />

      <main className="bg-white text-[#191c1d]">
        <ManualHero />

        {/* Body */}
        <section className="mx-auto max-w-360 px-5 py-16 md:px-16 md:py-24">
          <div className="grid gap-14 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[260px_minmax(0,1fr)]">
            {/* Sticky TOC */}
            <aside className="hidden lg:block">
              <nav
                aria-label="Contenido de la guía"
                className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2"
              >
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#5d616b]">
                  Contenido
                </p>
                <ul className="space-y-1 border-l border-[#191c1d]/10">
                  {TOC.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block border-l-2 border-transparent py-1.5 pl-4 text-sm text-[#5d616b] transition-colors hover:border-[#005bbf] hover:text-[#005bbf]"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* Mobile TOC */}
            <nav
              aria-label="Contenido de la guía"
              className="lg:hidden"
            >
              <details className="group rounded-2xl border border-[#191c1d]/10 bg-[#f8fafc]">
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-[#191c1d] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    Contenido de la guía
                    <svg
                      className="h-4 w-4 text-[#5d616b] transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </summary>
                <ul className="space-y-1 border-t border-[#191c1d]/8 px-3 py-3">
                  {TOC.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block rounded-lg px-3 py-2 text-sm text-[#414754] hover:bg-[#edf4ff] hover:text-[#005bbf]"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </nav>

            <div className="min-w-0 space-y-20 md:space-y-28">
              {/* 1 Intro */}
              <ManualSection
                id="introduccion"
                number={1}
                title="Introducción"
                description="Klarify convierte ideas, reuniones y documentos en un backlog ejecutable mediante un pipeline de agentes de IA. Cada fase se revisa y aprueba antes de continuar."
              >
                <h3 className="text-base font-semibold text-[#191c1d]">
                  ¿Qué puedes hacer?
                </h3>
                <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {CAPABILITIES.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[15px] leading-7 text-[#414754]"
                    >
                      <span
                        className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#005bbf]"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-10 grid gap-4 md:grid-cols-3">
                  {[
                    {
                      title: "Cuenta",
                      body: "Inicia sesión con Google o GitHub. No hay registro con email y contraseña.",
                    },
                    {
                      title: "Navegador",
                      body: "Usa Chrome, Firefox, Safari o Edge actualizados.",
                    },
                    {
                      title: "Contexto",
                      body: "Notas, PDF, ideas escritas o audio de reuniones (audio en Starter y Pro).",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="border-t border-[#191c1d]/10 pt-4"
                    >
                      <p className="text-sm font-semibold text-[#191c1d]">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[#5d616b]">{item.body}</p>
                    </div>
                  ))}
                </div>
              </ManualSection>

              {/* 2 Primer proyecto */}
              <ManualSection
                id="primer-proyecto"
                number={2}
                title="Crear tu primer proyecto"
                description="Todo en Klarify vive dentro de un proyecto. Cada uno tiene su propio pipeline, backlog y estado, para que puedas trabajar varias iniciativas a la vez."
              >
                <ManualStep
                  stepNumber={1}
                  title="Entra al workspace"
                  description='Desde la landing, usa “Empezar gratis” o “Ir a mi Agente”. Si no tienes sesión, irás a /login. Tras autenticarte, aterrizas en el hub de proyectos (/agentes/proyectos).'
                />
                <ManualStep
                  stepNumber={2}
                  title="Crea un proyecto"
                  description='En “Tu workspace”, pulsa “Nuevo proyecto” y dale un nombre claro (producto, cliente o iniciativa).'
                />
                <ManualStep
                  stepNumber={3}
                  title="Continúa el pipeline"
                  description='Abre el proyecto o usa “Continuar pipeline”. Empezarás en el Agente 1 para capturar el contexto.'
                  tips={[
                    "Free: 1 proyecto. Starter: 3. Pro: 10.",
                    "Puedes cambiar de proyecto desde el selector del sidebar.",
                    "Cada proyecto guarda su progreso de forma independiente.",
                  ]}
                  isLast
                />
              </ManualSection>

              {/* 3 Agente 1 */}
              <ManualSection
                id="agente-1"
                number={3}
                title="Agente 1: Ingesta de contexto"
                description="Captura la información inicial del proyecto, evalúa si hay contexto suficiente, hace preguntas clarificadoras y extrae los “deseos” (requisitos brutos) que alimentan el resto del pipeline."
              >
                <ManualCallout title="Según tu plan">
                  Free admite documentos <strong>.txt</strong> y <strong>.pdf</strong>. Starter y
                  Pro también permiten audio <strong>.mp3</strong> y <strong>.wav</strong> (hasta
                  50 MB). En todos los planes puedes escribir el contexto a mano.
                </ManualCallout>

                <div className="mt-8">
                  <ManualStep
                    stepNumber={1}
                    title="Sube o escribe tu contexto"
                    description="Arrastra un archivo al área de carga o escribe directamente. Incluye objetivos, restricciones y ejemplos concretos: cuanto más específico seas, mejores serán los deseos."
                  />
                  <ManualStep
                    stepNumber={2}
                    title="Revisa la transcripción"
                    description="Si cargaste audio, el agente lo transcribe. Corrige errores antes de seguir."
                  />
                  <ManualStep
                    stepNumber={3}
                    title="Responde las preguntas clarificadoras"
                    description="Si falta información, el agente te hará hasta 5 preguntas. Puedes elegir una opción o escribir tu propia respuesta."
                  />
                  <ManualStep
                    stepNumber={4}
                    title="Revisa los deseos extraídos"
                    description="Aprueba, rechaza o edita cada deseo. Son la base de épicas e historias posteriores."
                    tips={[
                      "Si el contexto es insuficiente, el agente te pedirá más información.",
                      "Errores aquí se propagan a todo el backlog: revísalos con calma.",
                    ]}
                  />
                  <ManualStep
                    stepNumber={5}
                    title="Aprueba el análisis"
                    description='Cuando la lista de deseos esté lista, pulsa “Aprobar”. El pipeline no avanza solo: tú confirmas cada etapa.'
                    isLast
                  />
                </div>
              </ManualSection>

              {/* 4 Agente 2 */}
              <ManualSection
                id="agente-2"
                number={4}
                title="Agente 2: Backlog inicial"
                description="Transforma los deseos aprobados en épicas e historias de usuario con descripción y criterios de aceptación."
              >
                <ManualStep
                  stepNumber={1}
                  title="Genera el backlog"
                  description='Pulsa “Generar backlog”. El agente agrupa funcionalidades en épicas y desglosa historias implementables.'
                />
                <ManualStep
                  stepNumber={2}
                  title="Revisa las épicas"
                  description="Comprueba que cubran las áreas importantes del producto y que no falte nada crítico."
                />
                <ManualStep
                  stepNumber={3}
                  title="Edita las historias"
                  description="Ajusta títulos, descripciones y criterios de aceptación. Puedes añadir o eliminar historias."
                />
                <ManualStep
                  stepNumber={4}
                  title="Regenera si hace falta"
                  description="Puedes regenerar el backlog. El sistema conserva tus ediciones manuales y regenera lo que no hayas tocado (según los límites de regeneración de tu plan)."
                  tips={[
                    "Criterios de aceptación claros ahorran tiempo en desarrollo.",
                    "Si una historia es demasiado grande, divídela ya en este paso.",
                    "Free tiene un backlog más compacto; Starter y Pro permiten más épicas e historias.",
                  ]}
                />
                <ManualStep
                  stepNumber={5}
                  title="Aprueba el backlog"
                  description="Confirma para pasar a la estimación en story points."
                  isLast
                />
              </ManualSection>

              {/* 5 Agente 3 */}
              <ManualSection
                id="agente-3"
                number={5}
                title="Agente 3: Estimación"
                description="Sugiere story points por historia según complejidad, esfuerzo e incertidumbre. Tú ajustas según la realidad de tu equipo."
              >
                <ManualStep
                  stepNumber={1}
                  title="Revisa las estimaciones"
                  description="La escala es Fibonacci: 1, 2, 3, 5, 8, 13 y 21."
                />
                <ManualStep
                  stepNumber={2}
                  title="Ajusta los valores"
                  description="Edita los puntos que no encajen con la experiencia de tu equipo. Los cambios se guardan."
                />
                <ManualStep
                  stepNumber={3}
                  title="Aprueba las estimaciones"
                  description="Cuando el conjunto sea coherente, aprueba para priorizar."
                  tips={[
                    "Historias de 13+ puntos suelen necesitar dividirse.",
                    "Las estimaciones son relativas: importa la consistencia entre historias.",
                  ]}
                  isLast
                />
              </ManualSection>

              {/* 6 Agente 4 */}
              <ManualSection
                id="agente-4"
                number={6}
                title="Agente 4: Priorización"
                description="Clasifica las historias según el framework que elijas. Klarify incluye cuatro metodologías; MoSCoW es la predeterminada."
              >
                <div className="mb-8 grid gap-4 sm:grid-cols-2">
                  {FRAMEWORKS.map((fw) => (
                    <div
                      key={fw.name}
                      className="rounded-2xl border border-[#191c1d]/10 px-5 py-4"
                    >
                      <p className="text-sm font-semibold text-[#191c1d]">{fw.name}</p>
                      <p className="mt-2 text-sm leading-6 text-[#5d616b]">{fw.summary}</p>
                    </div>
                  ))}
                </div>

                <ManualStep
                  stepNumber={1}
                  title="Elige el framework"
                  description="Selecciona MoSCoW, WSJF, RICE o Valor/Esfuerzo según cómo tu equipo prioriza."
                />
                <ManualStep
                  stepNumber={2}
                  title="Revisa la priorización sugerida"
                  description="El agente clasifica cada historia. Comprueba que la distribución refleje el valor de negocio real."
                />
                <ManualStep
                  stepNumber={3}
                  title="Ajusta prioridades"
                  description="Mueve historias entre categorías si no estás de acuerdo con la sugerencia."
                  tips={[
                    "Si casi todo es Must Have, redefine el alcance del MVP con tu equipo.",
                    "Las historias Won't Have se conservan por si cambian las prioridades más adelante.",
                  ]}
                />
                <ManualStep
                  stepNumber={4}
                  title="Aprueba la priorización"
                  description="Confirma para pasar a la planificación de sprints."
                  isLast
                />
              </ManualSection>

              {/* 7 Agente 5 */}
              <ManualSection
                id="agente-5"
                number={7}
                title="Agente 5: Planificación de sprints"
                description="Organiza las historias priorizadas en sprints con objetivos, capacidad, velocidad y cronograma."
              >
                <ManualStep
                  stepNumber={1}
                  title="Configura los parámetros"
                  description="Define duración del sprint (suele ser 1–2 semanas), velocidad del equipo en story points y capacidad disponible."
                />
                <ManualStep
                  stepNumber={2}
                  title="Genera el plan"
                  description='Pulsa “Generar plan”. El agente reparte historias respetando capacidad y prioridad.'
                />
                <ManualStep
                  stepNumber={3}
                  title="Revisa la distribución"
                  description="Cada sprint debería tener un objetivo claro y una carga equilibrada. Lo crítico debe ir primero."
                />
                <ManualStep
                  stepNumber={4}
                  title="Reasigna si hace falta"
                  description="Mueve historias entre sprints, ajusta objetivos o capacidad según tu realidad."
                  tips={[
                    "Un buen sprint se resume en una sola frase.",
                    "Deja margen en los primeros sprints para imprevistos.",
                  ]}
                />
                <ManualStep
                  stepNumber={5}
                  title="Aprueba el plan"
                  description="Al aprobar, desbloqueas el Dashboard y, según tu plan, el Tablero Kanban."
                  isLast
                />
              </ManualSection>

              {/* 8 Dashboard */}
              <ManualSection
                id="dashboard"
                number={8}
                title="Dashboard"
                description="Vista consolidada del proyecto en /agentes/dashboard: métricas, prioridades, sprints y el estado del pipeline."
              >
                <ManualStep
                  stepNumber={1}
                  title="Revisa las métricas"
                  description="Verás totales de historias, progreso, distribución por prioridad y el estado del pipeline."
                />
                <ManualStep
                  stepNumber={2}
                  title="Consulta el plan de sprints"
                  description="Cada sprint muestra historias asignadas, story points y objetivos."
                />
                <ManualStep
                  stepNumber={3}
                  title="Edita sin volver atrás"
                  description="Puedes ajustar historias y sprints desde el dashboard sin reabrir los agentes anteriores."
                  tips={[
                    "Úsalo para presentar el estado del proyecto a stakeholders.",
                    "Los datos se actualizan a medida que cambias el backlog o el tablero.",
                  ]}
                  isLast
                />
              </ManualSection>

              {/* 9 Kanban */}
              <ManualSection
                id="kanban"
                number={9}
                title="Tablero Kanban"
                description="Espacio de ejecución en /agentes/board: mueve historias por columnas con drag and drop, asigna personas y filtra por sprint."
              >
                <ManualCallout title="Disponibilidad">
                  El tablero está en <strong>Starter</strong> ($5/mes) y <strong>Pro</strong>{" "}
                  ($10/mes). En Free verás un aviso para actualizar el plan.
                </ManualCallout>

                <div className="mt-8">
                  <ManualStep
                    stepNumber={1}
                    title="Conoce las columnas"
                    description="To-Do → In Progress → Code Review → Done. Las historias avanzan de izquierda a derecha."
                  />
                  <ManualStep
                    stepNumber={2}
                    title="Mueve con drag and drop"
                    description="Arrastra una tarjeta a otra columna. El estado se guarda automáticamente."
                  />
                  <ManualStep
                    stepNumber={3}
                    title="Asigna el equipo"
                    description="Añade miembros y roles (Product Owner, Developer, QA, Designer, Scrum Master) y asígnalos a historias."
                  />
                  <ManualStep
                    stepNumber={4}
                    title="Filtra por sprint"
                    description="Si tienes varios sprints, filtra el tablero para enfocarte en el actual."
                    tips={[
                      "Limita cuántas historias hay en In Progress a la vez.",
                      "El progreso del tablero se refleja en el dashboard.",
                    ]}
                    isLast
                  />
                </div>
              </ManualSection>

              {/* 10 Proyectos */}
              <ManualSection
                id="proyectos"
                number={10}
                title="Gestión de proyectos"
                description="El hub /agentes/proyectos es el centro de tu workspace. Cada proyecto mantiene pipeline y backlog aislados."
              >
                <ManualStep
                  stepNumber={1}
                  title="Crear"
                  description='Pulsa “Nuevo proyecto” y elige un nombre descriptivo.'
                />
                <ManualStep
                  stepNumber={2}
                  title="Cambiar de proyecto"
                  description="Usa el selector de proyectos del sidebar en el workspace de agentes, o vuelve al hub para abrir otro."
                />
                <ManualStep
                  stepNumber={3}
                  title="Eliminar"
                  description="Puedes eliminar proyectos que ya no necesites. La acción es irreversible."
                  tips={[
                    "Free 1 · Starter 3 · Pro 10 proyectos activos.",
                    "Klarify recuerda el último proyecto o agente que visitaste.",
                  ]}
                  isLast
                />
              </ManualSection>

              {/* 11 Config */}
              <ManualSection
                id="configuracion"
                number={11}
                title="Configuración del workspace"
                description="Desde el ícono de configuración del sidebar puedes ajustar apariencia, integraciones y opciones generales."
              >
                <ManualStep
                  stepNumber={1}
                  title="Apariencia"
                  description="Elige Claro, Klarify (con acentos) u otros temas oscuros de desarrollo: One Dark Pro, Catppuccin, Solarized, Monokai, Nord y Gruvbox."
                />
                <ManualStep
                  stepNumber={2}
                  title="Integraciones: GitHub"
                  description="En Integraciones puedes vincular GitHub para exportar el backlog como Issues con etiquetas y criterios de aceptación."
                />
                <ManualStep
                  stepNumber={3}
                  title="Exportar a GitHub"
                  description="Con la cuenta conectada (plan Pro), elige repositorio y confirma la exportación. No hay sincronización automática: es una exportación manual."
                  tips={[
                    "GitHub Issues está disponible solo en Pro.",
                    "Free y Starter pueden exportar el backlog de forma manual según su plan.",
                    "Puedes revocar el acceso a GitHub en cualquier momento.",
                  ]}
                  isLast
                />
              </ManualSection>

              {/* 12 Consejos */}
              <section id="consejos" className="scroll-mt-28">
                <div className="overflow-hidden rounded-4xl bg-[#0a0b0c] px-6 py-14 text-white md:px-14 md:py-20">
                  <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
                    Paso 12
                  </p>
                  <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] md:text-5xl md:leading-[1.08]">
                    Consejos y buenas prácticas
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-7 text-white/60">
                    Un flujo claro y un contexto concreto suelen marcar la diferencia entre un
                    backlog usable y uno genérico.
                  </p>

                  <div className="mt-12 grid gap-12 lg:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.01em]">
                        Flujo recomendado
                      </h3>
                      <ol className="mt-5 space-y-3">
                        {[
                          "Prepara contexto real: notas, PDF o audio de kickoff.",
                          "En Agente 1, responde las clarificaciones con detalle.",
                          "Aprueba deseos solo cuando representen el producto.",
                          "En Agente 2, endurece criterios de aceptación.",
                          "Ajusta estimaciones y prioridades con tu equipo.",
                          "Configura velocidad real antes de generar sprints.",
                          "Usa Dashboard para alinear stakeholders.",
                          "Ejecuta día a día en el Kanban (Starter/Pro).",
                        ].map((step, i) => (
                          <li
                            key={step}
                            className="flex items-start gap-3 text-[15px] leading-7 text-white/65"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-bold text-white/80">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.01em]">
                        Errores frecuentes
                      </h3>
                      <ul className="mt-5 space-y-5">
                        {[
                          {
                            error: "Contexto vago",
                            fix: "Incluye ejemplos, nombres de funcionalidades y restricciones conocidas.",
                          },
                          {
                            error: "Aprobar deseos sin revisar",
                            fix: "Todo el backlog depende de esta base. Corrige antes de avanzar.",
                          },
                          {
                            error: "Historias demasiado grandes",
                            fix: "Si supera ~13 puntos, divídela en entregables más pequeños.",
                          },
                          {
                            error: "Sprints sobrecargados",
                            fix: "Prioriza realismo sobre densidad. Mejor margen que deuda acumulada.",
                          },
                        ].map((item) => (
                          <li key={item.error} className="border-t border-white/10 pt-5 first:border-0 first:pt-0">
                            <p className="text-sm font-semibold text-white">{item.error}</p>
                            <p className="mt-1.5 text-[15px] leading-7 text-white/60">
                              {item.fix}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#005bbf] px-7 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                    >
                      Empezar en Klarify
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                        />
                      </svg>
                    </Link>
                    <a
                      href="#introduccion"
                      className="text-sm font-medium text-white/55 transition-colors hover:text-white"
                    >
                      Volver al inicio de la guía
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </>
  );
}
