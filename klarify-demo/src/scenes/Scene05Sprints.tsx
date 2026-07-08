import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { carbonTheme } from "../theme";
import { fontFamily } from "../font";
import { GridBackground } from "../components/GridBackground";
import { CameraMotion } from "../components/CameraMotion";
import { SidebarMock } from "../components/SidebarMock";
import { Card } from "../components/Card";

const SPRINTS = [
  { name: "Sprint 1", goal: "Base de notificaciones", capacity: 0.85, stories: 6, startFrame: 20 },
  { name: "Sprint 2", goal: "Dashboard en tiempo real", capacity: 0.65, stories: 4, startFrame: 44 },
  { name: "Sprint 3", goal: "Integraciones externas", capacity: 0.45, stories: 3, startFrame: 68 },
];

export const Scene05Sprints: React.FC = () => {
  const frame = useCurrentFrame();
  const theme = carbonTheme;

  const headerOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background, fontFamily }}>
      <GridBackground theme={theme} />

      <CameraMotion
        fromScale={1}
        toScale={1.05}
        toTranslate={[-18, -6]}
        origin="45% 50%"
        frameRange={[0, 110]}
      >
        <AbsoluteFill style={{ flexDirection: "row" }}>
          <SidebarMock theme={theme} activeStep={5} fontFamily={fontFamily} />

          <div
            style={{
              flex: 1,
              padding: "70px 90px",
              display: "flex",
              flexDirection: "column",
              opacity: headerOpacity,
            }}
          >
            <h2
              style={{
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: theme.foreground,
                margin: "0 0 50px 0",
              }}
            >
              Sprints planificados con capacidad real
            </h2>

            <div style={{ display: "flex", gap: 28 }}>
              {SPRINTS.map((sprint) => {
                const local = frame - sprint.startFrame;
                const opacity = interpolate(local, [0, 18], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const y = interpolate(local, [0, 18], [30, 0], {
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const fill = interpolate(local, [16, 44], [0, sprint.capacity], {
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });

                return (
                  <Card
                    key={sprint.name}
                    theme={theme}
                    style={{
                      flex: 1,
                      padding: 32,
                      opacity,
                      translate: `0 ${y}px`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: theme.primary,
                        marginBottom: 12,
                      }}
                    >
                      {sprint.name}
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        color: theme.foreground,
                        marginBottom: 26,
                        lineHeight: 1.4,
                      }}
                    >
                      {sprint.goal}
                    </div>

                    <div
                      style={{
                        fontSize: 15,
                        color: theme.foregroundMuted,
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Capacidad</span>
                      <span>{Math.round(fill * 100)}%</span>
                    </div>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: theme.surfaceMuted,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${fill * 100}%`,
                          borderRadius: 999,
                          backgroundColor: theme.primary,
                        }}
                      />
                    </div>

                    <div
                      style={{
                        marginTop: 22,
                        fontSize: 15,
                        color: theme.foregroundSubtle,
                      }}
                    >
                      {sprint.stories} historias asignadas
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </AbsoluteFill>
      </CameraMotion>
    </AbsoluteFill>
  );
};
