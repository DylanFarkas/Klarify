import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/landing/LegalDocument";

export const metadata: Metadata = {
  title: "Política de privacidad | Klarify",
  description:
    "Cómo Klarify trata datos de cuenta, proyectos, contenido de IA e integraciones como GitHub.",
};

export default function PrivacidadPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Política de privacidad"
      summary="Explicamos qué datos tratamos cuando usas Klarify, con qué finalidad y qué control tienes sobre tu workspace, tu contenido de producto y las integraciones."
      updatedAt="11 de julio de 2026"
      alternate={{ label: "Ver términos de servicio", href: "/terminos" }}
      sections={[
        {
          id: "responsable",
          title: "Quiénes somos",
          content: (
            <>
              <p>
                Klarify es una plataforma que ayuda a equipos de producto a transformar ideas
                dispersas en backlogs ejecutables mediante agentes de IA. Esta política
                describe el tratamiento de datos personales y de proyecto asociado al uso del
                servicio.
              </p>
            </>
          ),
        },
        {
          id: "datos",
          title: "Datos que tratamos",
          content: (
            <>
              <p>Según cómo uses Klarify, podemos tratar:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="font-medium text-[#191c1d]">Datos de cuenta:</span>{" "}
                  identificadores y perfil básicos que nos facilitan los proveedores de
                  inicio de sesión (por ejemplo Google o GitHub), como nombre, correo y
                  foto.
                </li>
                <li>
                  <span className="font-medium text-[#191c1d]">Datos de workspace:</span>{" "}
                  proyectos, miembros, configuración y actividad dentro del pipeline de
                  agentes.
                </li>
                <li>
                  <span className="font-medium text-[#191c1d]">Contenido de producto:</span>{" "}
                  texto, documentos (p. ej. PDF), audio y demás material que subas para
                  descubrimiento, así como deseos, épicas, historias, estimaciones,
                  priorizaciones y planes de sprint generados o editados en la plataforma.
                </li>
                <li>
                  <span className="font-medium text-[#191c1d]">Datos técnicos:</span> logs
                  básicos de uso, dispositivo/navegador y señales necesarias para seguridad,
                  diagnóstico y mejora del servicio.
                </li>
                <li>
                  <span className="font-medium text-[#191c1d]">Integraciones:</span> tokens y
                  metadatos necesarios si conectas GitHub u otros servicios para exportar el
                  backlog.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "finalidades",
          title: "Para qué los usamos",
          content: (
            <>
              <ul className="list-disc space-y-2 pl-5">
                <li>Autenticarte y mantener tu sesión de forma segura.</li>
                <li>
                  Ejecutar el pipeline de agentes: evaluación de contexto, generación de
                  backlog, estimación, priorización y planificación de sprints.
                </li>
                <li>
                  Mostrar Dashboard, Kanban y funciones de colaboración dentro de tu
                  workspace.
                </li>
                <li>Aplicar límites de plan y gestionar suscripciones.</li>
                <li>
                  Exportar contenido a GitHub u otras integraciones solo cuando tú lo
                  autorices.
                </li>
                <li>Prevenir abuso, depurar errores y mejorar la calidad del producto.</li>
              </ul>
            </>
          ),
        },
        {
          id: "ia",
          title: "Procesamiento con IA",
          content: (
            <>
              <p>
                Para ofrecer el pipeline, tu contenido de proyecto puede enviarse a
                proveedores de modelos de IA y servicios relacionados (por ejemplo
                reconocimiento de voz o modelos de lenguaje) estrictamente para generar las
                salidas que solicitas en Klarify.
              </p>
              <p>
                No vendemos tu contenido de backlog. Pedimos a los proveedores que lo traten
                como datos de servicio y no como entrenamiento comercial abierto, en la
                medida que permitan sus contratos y controles disponibles. Aun así, evita
                subir secretos, credenciales o datos personales sensibles que no sean
                necesarios para el trabajo de producto.
              </p>
            </>
          ),
        },
        {
          id: "bases",
          title: "Bases del tratamiento",
          content: (
            <>
              <p>Tratamos datos cuando es necesario para:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Ejecutar el contrato de servicio (prestarte Klarify).</li>
                <li>Cumplir obligaciones legales aplicables.</li>
                <li>
                  Intereses legítimos de seguridad, prevención de fraude y mejora del
                  producto, equilibrados con tus derechos.
                </li>
                <li>Tu consentimiento, cuando una función lo requiera de forma explícita.</li>
              </ul>
            </>
          ),
        },
        {
          id: "comparticion",
          title: "Con quién se comparte",
          content: (
            <>
              <p>
                Compartimos datos solo con proveedores que nos ayudan a operar Klarify
                (infraestructura, autenticación, modelos de IA, analítica operativa) bajo
                obligaciones de confidencialidad y tratamiento adecuado.
              </p>
              <p>
                Si conectas GitHub, los datos que exportes quedarán sujetos también a la
                política de ese proveedor. No compartimos tu información con terceros para
                publicidad comportamental.
              </p>
            </>
          ),
        },
        {
          id: "retencion",
          title: "Conservación y seguridad",
          content: (
            <>
              <p>
                Conservamos los datos mientras tu cuenta y proyectos estén activos, y el
                tiempo adicional razonable para backups, obligaciones legales o resolución de
                incidencias. Puedes solicitar la eliminación de tu cuenta y del contenido
                asociado, salvo retención legalmente requerida.
              </p>
              <p>
                Aplicamos medidas técnicas y organizativas razonables (control de acceso,
                cifrado en tránsito y prácticas de endurecimiento) para proteger la
                información. Ningún sistema es 100 % seguro; te pedimos también cuidar el
                acceso a tu cuenta y a los workspaces que administras.
              </p>
            </>
          ),
        },
        {
          id: "derechos",
          title: "Tus derechos",
          content: (
            <>
              <p>
                Según la normativa aplicable, puedes solicitar acceso, rectificación,
                eliminación, oposición, limitación o portabilidad de tus datos personales, y
                retirar consentimientos cuando el tratamiento se base en ellos.
              </p>
              <p>
                Dentro del producto, tú controlas el acceso a cada workspace y puedes
                desconectar integraciones como GitHub en cualquier momento. Para ejercer
                derechos adicionales, contacta con nosotros desde el soporte de la
                plataforma.
              </p>
            </>
          ),
        },
        {
          id: "menores",
          title: "Menores",
          content: (
            <>
              <p>
                Klarify está pensado para uso profesional. No está dirigido a menores de 16
                años. Si detectamos una cuenta creada por un menor sin base legal adecuada,
                la eliminaremos.
              </p>
            </>
          ),
        },
        {
          id: "cambios",
          title: "Cambios en esta política",
          content: (
            <>
              <p>
                Podemos actualizar esta política cuando cambien el producto, los proveedores
                o la ley. Publicaremos la versión vigente en esta página con su fecha de
                actualización. Si el cambio es relevante, lo comunicaremos de forma visible
                en el servicio.
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
                Para consultas de privacidad, usa el canal de soporte de Klarify. También
                puedes revisar los{" "}
                <Link
                  className="font-medium text-[#005bbf] underline-offset-2 hover:underline"
                  href="/terminos"
                >
                  Términos de servicio
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
