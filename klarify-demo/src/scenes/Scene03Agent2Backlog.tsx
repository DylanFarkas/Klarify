import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { carbonTheme } from "../theme";
import { fontFamily } from "../font";
import { GridBackground } from "../components/GridBackground";
import { CameraMotion } from "../components/CameraMotion";
import { SidebarMock } from "../components/SidebarMock";
import { Card } from "../components/Card";
import { CheckDraw } from "../components/CheckDraw";

const CRITERIA = [
  { text: "El usuario recibe la notificacion en menos de 2 segundos", frame: 62 },
  { text: "Puede silenciar categorias especificas de alertas", frame: 78 },
  { text: "Historial de notificaciones disponible por 30 dias", frame: 94 },
];

export const Scene03Agent2Backlog: React.FC = () => {
  const frame = useCurrentFrame();
  const theme = carbonTheme;

  const headerOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const expand = interpolate(frame, [30, 55], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const chevronRotate = interpolate(frame, [30, 55], [0, 180], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background, fontFamily }}>
      <GridBackground theme={theme} />

      <CameraMotion
        fromScale={1}
        toScale={1.05}
        toTranslate={[10, -12]}
        origin="55% 50%"
        frameRange={[0, 130]}
      >
        <AbsoluteFill style={{ flexDirection: "row" }}>
          <SidebarMock theme={theme} activeStep={2} fontFamily={fontFamily} />

          <div
            style={{
              flex: 1,
              padding: "70px 90px",
              display: "flex",
              flexDirection: "column",
              opacity: headerOpacity,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                padding: "8px 18px",
                borderRadius: 999,
                backgroundColor: theme.surfaceMuted,
                border: `1px solid ${theme.border}`,
                color: theme.primary,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 28,
              }}
            >
              Paso 02 de 06
            </div>

            <h2
              style={{
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: theme.foreground,
                margin: "0 0 44px 0",
              }}
            >
              De deseos a historias listas para estimar
            </h2>

            <Card theme={theme} accentBorder style={{ padding: 36 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: theme.primary,
                    letterSpacing: "0.06em",
                    padding: "6px 14px",
                    borderRadius: 999,
                    backgroundColor: theme.surfaceMuted,
                  }}
                >
                  EPIC-001
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 28,
                    fontWeight: 700,
                    color: theme.foreground,
                  }}
                >
                  Notificaciones y alertas en tiempo real
                </span>
                <div
                  style={{
                    scale: 1,
                    rotate: `${chevronRotate}deg`,
                    color: theme.foregroundMuted,
                  }}
                >
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <path
                      d="m6 9 6 6 6-6"
                      stroke="currentColor"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <div
                style={{
                  maxHeight: expand * 360,
                  opacity: expand,
                  overflow: "hidden",
                  marginTop: expand * 32,
                }}
              >
                <div
                  style={{
                    borderTop: `1px solid ${theme.border}`,
                    paddingTop: 28,
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: theme.primary,
                      letterSpacing: "0.06em",
                    }}
                  >
                    HU-001
                  </span>
                  <p style={{ fontSize: 24, color: theme.foreground, margin: "8px 0 0 0" }}>
                    Como usuario quiero recibir notificaciones push relevantes
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {CRITERIA.map((c) => {
                    const local = frame - c.frame;
                    const opacity = interpolate(local, [0, 14], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    });
                    return (
                      <div
                        key={c.text}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          opacity,
                        }}
                      >
                        <CheckDraw startFrame={c.frame} color={theme.primary} size={26} />
                        <span style={{ fontSize: 20, color: theme.foregroundMuted }}>
                          {c.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        </AbsoluteFill>
      </CameraMotion>
    </AbsoluteFill>
  );
};
