import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { carbonTheme } from "../theme";
import { fontFamily } from "../font";
import { GridBackground } from "../components/GridBackground";
import { CameraMotion } from "../components/CameraMotion";

export const Scene09Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const theme = carbonTheme;

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoScale = interpolate(frame, [0, 20], [0.9, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineOpacity = interpolate(frame, [20, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [20, 38], [16, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaOpacity = interpolate(frame, [40, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaScale = interpolate(frame, [40, 58], [0.92, 1], {
    easing: Easing.bezier(0.34, 1.3, 0.64, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowPulse = 0.55 + Math.sin(frame * 0.05) * 0.15;

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

      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.primary}33 0%, transparent 70%)`,
          opacity: glowPulse,
        }}
      />

      <CameraMotion
        fromScale={1.08}
        toScale={1}
        origin="50% 50%"
        frameRange={[0, 65]}
      >
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              opacity: logoOpacity,
              scale: logoScale,
              marginBottom: 34,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                backgroundColor: theme.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f1c17",
                fontWeight: 800,
                fontSize: 34,
              }}
            >
              K
            </div>
            <span
              style={{
                fontSize: 68,
                fontWeight: 800,
                color: theme.foreground,
                letterSpacing: "-0.03em",
              }}
            >
              Klarify
            </span>
          </div>

          <p
            style={{
              fontSize: 32,
              color: theme.foregroundMuted,
              opacity: taglineOpacity,
              translate: `0 ${taglineY}px`,
              margin: "0 0 48px 0",
            }}
          >
            De la idea al backlog ejecutable, en minutos.
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "22px 48px",
              borderRadius: 999,
              backgroundColor: theme.primary,
              color: "#0f1c17",
              fontSize: 26,
              fontWeight: 800,
              opacity: ctaOpacity,
              scale: ctaScale,
            }}
          >
            Empieza gratis
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14m-6-6 6 6-6 6"
                stroke="#0f1c17"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </AbsoluteFill>
      </CameraMotion>
    </AbsoluteFill>
  );
};
