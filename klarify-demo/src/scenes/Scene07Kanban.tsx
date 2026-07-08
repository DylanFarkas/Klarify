import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { carbonTheme } from "../theme";
import { fontFamily } from "../font";
import { GridBackground } from "../components/GridBackground";
import { SidebarMock } from "../components/SidebarMock";
import { Card } from "../components/Card";

const COLUMNS = [
  {
    label: "To-Do",
    cards: ["HU-009 Ajustes de perfil", "HU-011 Filtro por sprint"],
  },
  { label: "In Progress", cards: ["HU-005 Auth con GitHub"] },
  { label: "Code Review", cards: ["HU-003 Dashboard metricas"] },
  { label: "Done", cards: ["HU-001 Backlog inicial", "HU-002 Estimacion SP"] },
];

const AVATAR_COLORS = ["#3ecf8e", "#4d9fff", "#f472b6", "#fbbf24"];

const columnFrames = [0, 20, 35, 55, 70, 90, 105, 130];
const columnPercents = [12, 12, 37, 37, 62, 62, 87, 87];

export const Scene07Kanban: React.FC = () => {
  const frame = useCurrentFrame();
  const theme = carbonTheme;

  const headerOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardLeftPct = interpolate(frame, columnFrames, columnPercents, {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardTop = interpolate(
    frame,
    columnFrames,
    [340, 340, 300, 300, 260, 260, 220, 220],
    {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const cardLift = interpolate(
    frame,
    [18, 26, 34, 53, 61, 69, 88, 96, 104, 123],
    [0, -14, 0, 0, -14, 0, 0, -14, 0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const scale = interpolate(frame, columnFrames, [
    1.02, 1.02, 1.06, 1.06, 1.06, 1.06, 1.08, 1.08,
  ], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const camTranslateX = interpolate(
    frame,
    columnFrames,
    columnPercents.map((p) => (50 - p) * 2.1),
    {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background, fontFamily }}>
      <GridBackground theme={theme} />

      <AbsoluteFill
        style={{
          flexDirection: "row",
          scale,
          translate: `${camTranslateX}px 0`,
          transformOrigin: "55% 55%",
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
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 40,
            }}
          >
            <h2
              style={{
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: theme.foreground,
                margin: 0,
              }}
            >
              Ejecuta en el tablero Kanban
            </h2>

            <div style={{ display: "flex", marginRight: 4 }}>
              {AVATAR_COLORS.map((color, i) => (
                <div
                  key={color}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: `3px solid ${theme.background}`,
                    marginLeft: i === 0 ? 0 : -14,
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, flex: 1, position: "relative" }}>
            {COLUMNS.map((col) => (
              <div
                key={col.label}
                style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: theme.foregroundMuted,
                    marginBottom: 4,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {col.label}
                </div>
                {col.cards.map((c) => (
                  <Card
                    key={c}
                    theme={theme}
                    style={{ padding: "18px 20px", fontSize: 17, color: theme.foreground }}
                  >
                    {c}
                  </Card>
                ))}
              </div>
            ))}

            <div
              style={{
                position: "absolute",
                left: `${cardLeftPct}%`,
                top: cardTop + cardLift,
                transform: "translateX(-50%)",
                width: 300,
              }}
            >
              <Card
                theme={theme}
                accentBorder
                style={{
                  padding: "20px 24px",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: theme.primary,
                    marginBottom: 8,
                    letterSpacing: "0.05em",
                  }}
                >
                  HU-014
                </div>
                <div style={{ fontSize: 18, color: theme.foreground, marginBottom: 14 }}>
                  Recibir push notifications
                </div>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    backgroundColor: "#4d9fff",
                  }}
                />
              </Card>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
