import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { carbonTheme, moscowColors } from "../theme";
import { fontFamily } from "../font";
import { GridBackground } from "../components/GridBackground";
import { SidebarMock } from "../components/SidebarMock";
import { Card } from "../components/Card";

const STORY_POINTS = [
  { id: "HU-001", label: "Notificaciones push", sp: 5, frame: 14 },
  { id: "HU-002", label: "Dashboard en tiempo real", sp: 8, frame: 30 },
  { id: "HU-003", label: "Integracion con Slack", sp: 3, frame: 46 },
];

const MOSCOW_COLUMNS = [
  { key: "must", label: "Must", color: moscowColors.must, cards: ["Notificaciones push", "Auth con GitHub"] },
  { key: "should", label: "Should", color: moscowColors.should, cards: ["Dashboard metricas"] },
  { key: "could", label: "Could", color: moscowColors.could, cards: ["Integracion Slack", "Modo oscuro"] },
  { key: "wont", label: "Won't", color: moscowColors.wont, cards: ["Exportar a PDF"] },
];

export const Scene04EstimationPriority: React.FC = () => {
  const frame = useCurrentFrame();
  const theme = carbonTheme;

  const scale = interpolate(frame, [0, 58, 130], [1.04, 1.0, 1.06], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, 58, 130], [-6, 0, -12], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const phaseAOpacity = interpolate(frame, [50, 66], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const phaseBOpacity = interpolate(frame, [50, 66], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headerOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background, fontFamily }}>
      <GridBackground theme={theme} />

      <AbsoluteFill
        style={{
          flexDirection: "row",
          scale,
          translate: `0 ${translateY}px`,
          transformOrigin: "50% 55%",
        }}
      >
        <SidebarMock theme={theme} activeStep={3} fontFamily={fontFamily} />

        <div
          style={{
            flex: 1,
            padding: "70px 90px",
            display: "flex",
            flexDirection: "column",
            opacity: headerOpacity,
            position: "relative",
          }}
        >
          <h2
            style={{
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: theme.foreground,
              margin: "0 0 44px 0",
            }}
          >
            Estimacion y priorizacion sin fricciones
          </h2>

          <div
            style={{
              position: "absolute",
              top: 176,
              left: 90,
              right: 90,
              opacity: phaseAOpacity,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {STORY_POINTS.map((story) => {
              const local = frame - story.frame;
              const opacity = interpolate(local, [0, 16], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const x = interpolate(local, [0, 16], [-24, 0], {
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <Card
                  key={story.id}
                  theme={theme}
                  style={{
                    padding: "24px 32px",
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    opacity,
                    translate: `${x}px 0`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: theme.primary,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {story.id}
                  </span>
                  <span style={{ flex: 1, fontSize: 24, color: theme.foreground }}>
                    {story.label}
                  </span>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      backgroundColor: theme.primary,
                      color: "#0f1c17",
                      fontSize: 24,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {story.sp}
                  </div>
                </Card>
              );
            })}
          </div>

          <div
            style={{
              position: "absolute",
              top: 176,
              left: 90,
              right: 90,
              bottom: 70,
              opacity: phaseBOpacity,
              display: "flex",
              gap: 22,
            }}
          >
            {MOSCOW_COLUMNS.map((col, colIndex) => (
              <div
                key={col.key}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: col.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: theme.foreground,
                    }}
                  >
                    {col.label}
                  </span>
                </div>

                {col.cards.map((cardText, cardIndex) => {
                  const startFrame = 66 + colIndex * 6 + cardIndex * 10;
                  const local = frame - startFrame;
                  const opacity = interpolate(local, [0, 16], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  const y = interpolate(local, [0, 16], [-36, 0], {
                    easing: Easing.bezier(0.34, 1.2, 0.64, 1),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  return (
                    <Card
                      key={cardText}
                      theme={theme}
                      style={{
                        padding: "18px 20px",
                        fontSize: 17,
                        color: theme.foreground,
                        opacity,
                        translate: `0 ${y}px`,
                        borderLeft: `3px solid ${col.color}`,
                      }}
                    >
                      {cardText}
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
