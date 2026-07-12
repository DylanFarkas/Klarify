import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { carbonTheme } from "../theme";
import { fontFamily } from "../font";
import { GridBackground } from "../components/GridBackground";
import { CameraMotion } from "../components/CameraMotion";
import { Card } from "../components/Card";
import { CountUp } from "../components/CountUp";
import { CheckDraw } from "../components/CheckDraw";

export const Scene08GithubExport: React.FC = () => {
  const frame = useCurrentFrame();
  const theme = carbonTheme;

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 18], [24, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardY = interpolate(frame, [20, 40], [30, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.background,
        fontFamily,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <GridBackground theme={theme} />

      <CameraMotion
        fromScale={1}
        toScale={1.1}
        toTranslate={[0, -10]}
        origin="50% 62%"
        frameRange={[20, 100]}
      >
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 1180, textAlign: "center" }}>
            <h2
              style={{
                fontSize: 58,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: theme.foreground,
                margin: "0 0 56px 0",
                opacity: titleOpacity,
                translate: `0 ${titleY}px`,
              }}
            >
              Exporta a GitHub con un clic
            </h2>

            <Card
              theme={theme}
              accentBorder
              style={{
                padding: 48,
                textAlign: "left",
                opacity: cardOpacity,
                translate: `0 ${cardY}px`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    backgroundColor: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width={36} height={36} viewBox="0 0 16 16" fill="#0f1c17">
                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                  </svg>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: theme.foreground }}>
                    Exportando a /klarify/product-repo
                  </div>
                  <div style={{ fontSize: 19, color: theme.foregroundMuted, marginTop: 8 }}>
                    Historias, criterios de aceptacion y prioridades incluidas
                  </div>
                </div>

                <CheckDraw startFrame={78} color={theme.primary} size={44} />
              </div>

              <div
                style={{
                  marginTop: 40,
                  paddingTop: 32,
                  borderTop: `1px solid ${theme.border}`,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 64, fontWeight: 800, color: theme.primary }}>
                  <CountUp to={12} startFrame={44} durationInFrames={26} />
                </span>
                <span style={{ fontSize: 22, color: theme.foregroundMuted }}>
                  issues generados en GitHub
                </span>
              </div>
            </Card>
          </div>
        </AbsoluteFill>
      </CameraMotion>
    </AbsoluteFill>
  );
};
