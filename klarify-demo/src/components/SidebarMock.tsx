import type { Theme } from "../theme";

type SidebarMockProps = {
  theme: Theme;
  activeStep: number;
  fontFamily: string;
};

const STEPS = [
  "Ingesta de Contexto",
  "Backlog Inicial",
  "Estimacion",
  "Priorizacion",
  "Planificacion de Sprints",
  "Dashboard",
];

export const SidebarMock: React.FC<SidebarMockProps> = ({
  theme,
  activeStep,
  fontFamily,
}) => {
  return (
    <div
      style={{
        width: 340,
        height: "100%",
        backgroundColor: theme.surface,
        borderRight: `1px solid ${theme.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "40px 28px",
        fontFamily,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 56 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: theme.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          K
        </div>
        <span style={{ fontSize: 24, fontWeight: 700, color: theme.foreground }}>
          Klarify
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {STEPS.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === activeStep;
          const isDone = stepNum < activeStep;
          return (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 16px",
                borderRadius: 12,
                backgroundColor: isActive ? theme.surfaceMuted : "transparent",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                  backgroundColor: isActive
                    ? theme.primary
                    : isDone
                      ? theme.primary
                      : "transparent",
                  color: isActive || isDone ? "#fff" : theme.foregroundSubtle,
                  border: isActive || isDone ? "none" : `1.5px solid ${theme.borderStrong}`,
                }}
              >
                {isDone ? "✓" : stepNum}
              </div>
              <span
                style={{
                  fontSize: 17,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? theme.foreground : theme.foregroundMuted,
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
