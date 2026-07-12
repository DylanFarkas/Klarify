import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/landing/LegalDocument";

export const metadata: Metadata = {
  title: "Términos de servicio | Klarify",
  description:
    "Condiciones de uso de Klarify: cuentas, planes, contenido generado con IA e integraciones.",
};

export default function TerminosPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Términos de servicio"
      summary="Estas condiciones regulan el acceso y uso de Klarify, la plataforma que ayuda a equipos de producto a convertir ideas en backlogs ejecutables con agentes de IA."
      updatedAt="11 de julio de 2026"
      alternate={{ label: "Ver política de privacidad", href: "/privacidad" }}
      sections={[
        {
          id: "aceptacion",
          title: "Aceptación",
          content: (
            <>
              <p>
                Al crear una cuenta, iniciar sesión o usar Klarify aceptas estos términos. Si
                no estás de acuerdo, no uses el servicio.
              </p>
              <p>
                Si usas Klarify en nombre de una organización, declaras que tienes autoridad
                para vincularla a estas condiciones.
              </p>
            </>
          ),
        },
        {
          id: "servicio",
          title: "Qué es Klarify",
          content: (
            <>
              <p>
                Klarify es una plataforma SaaS con un pipeline de agentes de IA orientado a
                Product Owners y equipos de producto. El flujo típico incluye:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Captura de contexto desde texto, documentos o audio (según el plan).</li>
                <li>Extracción de deseos y generación de épicas e historias de usuario.</li>
                <li>Estimación con story points, priorización y planificación de sprints.</li>
                <li>
                  Seguimiento en Dashboard y Kanban, y exportación a GitHub Issues en planes
                  que lo incluyan.
                </li>
              </ul>
              <p>
                El resultado de cada etapa está pensado para revisión humana: Klarify asiste,
                pero el equipo decide qué aceptar, editar o descartar antes de continuar.
              </p>
            </>
          ),
        },
        {
          id: "cuenta",
          title: "Cuenta y acceso",
          content: (
            <>
              <p>
                El acceso se realiza mediante autenticación con proveedores externos (por
                ejemplo Google o GitHub). Eres responsable de mantener la seguridad de tu
                cuenta y de la actividad que ocurra bajo tu sesión.
              </p>
              <p>
                Debes proporcionar información veraz y notificar cualquier uso no autorizado.
                Podemos suspender o cerrar cuentas que incumplan estos términos o pongan en
                riesgo la plataforma u otros usuarios.
              </p>
            </>
          ),
        },
        {
          id: "planes",
          title: "Planes y facturación",
          content: (
            <>
              <p>
                Klarify ofrece planes Free, Starter y Pro con límites distintos de proyectos y
                funciones (por ejemplo exportación a GitHub en Pro). Los precios publicados en
                la landing están en USD y pueden actualizarse con aviso previo en la web.
              </p>
              <p>
                Puedes cambiar de plan según la disponibilidad del producto. Si cancelas un
                plan de pago, conservarás el acceso hasta el final del periodo ya abonado,
                salvo que indiquemos lo contrario al momento de la compra.
              </p>
            </>
          ),
        },
        {
          id: "contenido",
          title: "Tu contenido y el generado por IA",
          content: (
            <>
              <p>
                Conservas la titularidad del material que subes o introduces en Klarify
                (notas, PDFs, audio, deseos, ediciones del backlog y datos de proyecto). Nos
                concedes una licencia limitada para procesarlo solo con el fin de operar el
                servicio (incluidos los agentes de IA y las integraciones que actives).
              </p>
              <p>
                El contenido generado por los agentes (historias, criterios de aceptación,
                estimaciones, priorizaciones, planes de sprint, etc.) se te entrega para uso
                en tu trabajo de producto. Ese material puede contener inexactitudes: debes
                revisarlo antes de usarlo en producción, con clientes o en compromisos
                contractuales.
              </p>
              <p>
                No uses Klarify para cargar contenido ilegal, que vulneren derechos de
                terceros o que no tengas derecho a tratar.
              </p>
            </>
          ),
        },
        {
          id: "integraciones",
          title: "Integraciones",
          content: (
            <>
              <p>
                Funciones como la exportación a GitHub requieren tu autorización explícita. Al
                conectar una integración, aceptas también los términos del proveedor externo.
                Puedes desconectar la integración desde la configuración cuando quieras; la
                desconexión no revierte datos ya exportados fuera de Klarify.
              </p>
            </>
          ),
        },
        {
          id: "uso-aceptable",
          title: "Uso aceptable",
          content: (
            <>
              <p>Te comprometes a no:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Intentar acceder a cuentas, workspaces o datos ajenos.</li>
                <li>Abusar de la API, automatizar scrapers o sobrecargar el servicio.</li>
                <li>
                  Usar el producto para generar contenido engañoso a gran escala, malware o
                  actividad fraudulenta.
                </li>
                <li>Reverse-engineer o revender el servicio sin autorización escrita.</li>
              </ul>
            </>
          ),
        },
        {
          id: "propiedad",
          title: "Propiedad de Klarify",
          content: (
            <>
              <p>
                Klarify, su marca, interfaz, agentes, documentación y software siguen siendo
                propiedad nuestra o de nuestros licenciantes. Estos términos no te transfieren
                derechos sobre el producto más allá de una licencia de uso limitada,
                no exclusiva y revocable mientras cumplas las condiciones.
              </p>
            </>
          ),
        },
        {
          id: "disponibilidad",
          title: "Disponibilidad y cambios",
          content: (
            <>
              <p>
                Nos esforzamos por mantener Klarify disponible, pero no garantizamos un
                servicio ininterrumpido ni libre de errores. Podemos modificar funciones,
                límites de plan o el pipeline de agentes para mejorar el producto, con
                comunicación razonable cuando el cambio sea material.
              </p>
            </>
          ),
        },
        {
          id: "responsabilidad",
          title: "Limitación de responsabilidad",
          content: (
            <>
              <p>
                En la medida permitida por la ley aplicable, Klarify se ofrece “tal cual”. No
                respondemos por daños indirectos, lucro cesante, pérdida de datos o decisiones
                de negocio tomadas a partir de salidas de IA no revisadas.
              </p>
              <p>
                Nuestra responsabilidad total acumulada por reclamaciones relacionadas con el
                servicio no excederá, en su conjunto, el importe que hayas pagado a Klarify en
                los tres meses anteriores al evento que dio lugar a la reclamación (o cero si
                usas el plan Free).
              </p>
            </>
          ),
        },
        {
          id: "ley",
          title: "Ley aplicable",
          content: (
            <>
              <p>
                Estos términos se interpretan conforme a la legislación aplicable en el país
                de establecimiento del responsable del servicio, sin perjuicio de normas
                imperativas de protección al consumidor que te correspondan.
              </p>
            </>
          ),
        },
        {
          id: "contacto",
          title: "Contacto",
          content: (
            <>
              <p>
                Para dudas sobre estos términos, escribe a través del soporte indicado en la
                plataforma o consulta también nuestra{" "}
                <Link
                  className="font-medium text-[#005bbf] underline-offset-2 hover:underline"
                  href="/privacidad"
                >
                  Política de privacidad
                </Link>
                .
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
