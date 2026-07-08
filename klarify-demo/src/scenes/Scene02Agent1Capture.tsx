import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { carbonTheme } from "../theme";
import { fontFamily } from "../font";
import { GridBackground } from "../components/GridBackground";
import { CameraMotion } from "../components/CameraMotion";
import { SidebarMock } from "../components/SidebarMock";
import { Card } from "../components/Card";
import { CheckDraw } from "../components/CheckDraw";

const WISHES = [
  { id: "DESEO-001", text: "Sistema de notificaciones push", frame: 44 },
  { id: "DESEO-002", text: "Dashboard de metricas en tiempo real", frame: 64 },
  { id: "DESEO-003", text: "Integracion nativa con Slack", frame: 84 },
];

const BAR_COUNT = 28;

export const Scene02Agent1Capture: React.FC = () => {
  const frame = useCurrentFrame();
  const theme = carbonTheme;

  const punchScale = interpolate(frame, [0, 14], [1.1, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headerOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.background,
        fontFamily,
        scale: punchScale,
      }}
    >
      <GridBackground theme={theme} />

      <CameraMotion
        fromScale={1}
        toScale={1.05}
        toTranslate={[-14, -8]}
        origin="52% 50%"
        frameRange={[10, 130]}
      >
        <AbsoluteFill style={{ flexDirection: "row" }}>
          <SidebarMock theme={theme} activeStep={1} fontFamily={fontFamily} />

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
              Paso 01 de 06
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
              Sube tu reunion, deja que la IA escuche
            </h2>

            <Card
              theme={theme}
              accentBorder
              style={{
                padding: 40,
                display: "flex",
                alignItems: "center",
                gap: 32,
                marginBottom: 40,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  backgroundColor: theme.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0M12 19v3"
                    stroke="#0f1c17"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: theme.foreground,
                    marginBottom: 6,
                  }}
                >
                  reunion-kickoff.mp3
                </div>
                <div style={{ fontSize: 18, color: theme.foregroundMuted }}>
                  Transcribiendo audio...
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 4,
                  height: 48,
                }}
              >
                {Array.from({ length: BAR_COUNT }).map((_, i) => {
                  const base = 6 + Math.abs(Math.sin(i * 0.7)) * 18;
                  const wave =
                    Math.sin(frame * 0.22 + i * 0.55) * 14 * (0.4 + Math.abs(Math.cos(i)));
                  const height = Math.max(4, base + wave);
                  return (
                    <div
                      key={i}
                      style={{
                        width: 4,
                        height,
                        borderRadius: 2,
                        backgroundColor: theme.primary,
                        opacity: 0.85,
                      }}
                    />
                  );
                })}
              </div>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {WISHES.map((wish) => {
                const local = frame - wish.frame;
                const opacity = interpolate(local, [0, 16], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const x = interpolate(local, [0, 16], [-30, 0], {
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });

                return (
                  <div
                    key={wish.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      padding: "18px 26px",
                      borderRadius: 14,
                      backgroundColor: theme.surface,
                      border: `1px solid ${theme.border}`,
                      opacity,
                      translate: `${x}px 0`,
                    }}
                  >
                    <CheckDraw startFrame={wish.frame} color={theme.primary} size={30} />
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: theme.primary,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {wish.id}
                    </span>
                    <span style={{ fontSize: 22, color: theme.foreground }}>
                      {wish.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </AbsoluteFill>
      </CameraMotion>
    </AbsoluteFill>
  );
};
