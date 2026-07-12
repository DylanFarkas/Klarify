import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { carbonTheme } from "../theme";
import { fontFamily } from "../font";
import { GridBackground } from "../components/GridBackground";
import { SidebarMock } from "../components/SidebarMock";
import { Card } from "../components/Card";
import { CountUp } from "../components/CountUp";

const METRICS = [
  { label: "Historias completadas", to: 42, frame: 14 },
  { label: "Story points totales", to: 186, frame: 22 },
  { label: "Sprints activos", to: 3, frame: 30 },
];

const EPIC_BARS = [
  { label: "Notif.", value: 0.9 },
  { label: "Dashboard", value: 0.65 },
  { label: "Auth", value: 0.8 },
  { label: "Slack", value: 0.4 },
  { label: "Board", value: 0.55 },
];

const RING_RADIUS = 84;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

export const Scene06Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const theme = carbonTheme;

  const scale = interpolate(frame, [0, 60, 130], [1.02, 1.1, 1.03], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateX = interpolate(frame, [0, 60, 130], [0, -60, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headerOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const progressPct = interpolate(frame, [16, 60], [0, 0.82], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
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
          translate: `${translateX}px 0`,
          transformOrigin: "62% 55%",
        }}
      >
        <SidebarMock theme={theme} activeStep={6} fontFamily={fontFamily} />

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
              margin: "0 0 40px 0",
            }}
          >
            Tu progreso, en un vistazo
          </h2>

          <div style={{ display: "flex", gap: 24, marginBottom: 36 }}>
            {METRICS.map((metric) => (
              <Card
                key={metric.label}
                theme={theme}
                style={{ flex: 1, padding: "28px 30px" }}
              >
                <div
                  style={{
                    fontSize: 46,
                    fontWeight: 800,
                    color: theme.primary,
                    marginBottom: 8,
                  }}
                >
                  <CountUp to={metric.to} startFrame={metric.frame} durationInFrames={36} />
                </div>
                <div style={{ fontSize: 17, color: theme.foregroundMuted }}>
                  {metric.label}
                </div>
              </Card>
            ))}
          </div>

          <div style={{ display: "flex", gap: 24, flex: 1 }}>
            <Card
              theme={theme}
              style={{
                width: 320,
                padding: 32,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={200} height={200} viewBox="0 0 200 200">
                <circle
                  cx={100}
                  cy={100}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={theme.surfaceMuted}
                  strokeWidth={14}
                />
                <circle
                  cx={100}
                  cy={100}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={theme.primary}
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={RING_CIRC * (1 - progressPct)}
                  transform="rotate(-90 100 100)"
                />
                <text
                  x={100}
                  y={95}
                  textAnchor="middle"
                  fontSize={40}
                  fontWeight={800}
                  fill={theme.foreground}
                  fontFamily={fontFamily}
                >
                  {Math.round(progressPct * 100)}%
                </text>
                <text
                  x={100}
                  y={124}
                  textAnchor="middle"
                  fontSize={15}
                  fill={theme.foregroundMuted}
                  fontFamily={fontFamily}
                >
                  Pipeline
                </text>
              </svg>
            </Card>

            <Card
              theme={theme}
              style={{
                flex: 1,
                padding: 32,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: theme.foreground,
                  marginBottom: 24,
                }}
              >
                Avance por epica
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 28,
                  paddingBottom: 8,
                }}
              >
                {EPIC_BARS.map((bar, index) => {
                  const startFrame = 40 + index * 8;
                  const height = interpolate(
                    frame,
                    [startFrame, startFrame + 30],
                    [0, bar.value * 160],
                    {
                      easing: Easing.bezier(0.16, 1, 0.3, 1),
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    },
                  );
                  return (
                    <div
                      key={bar.label}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height,
                          borderRadius: "8px 8px 0 0",
                          backgroundColor: theme.primary,
                        }}
                      />
                      <span style={{ fontSize: 14, color: theme.foregroundMuted }}>
                        {bar.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
