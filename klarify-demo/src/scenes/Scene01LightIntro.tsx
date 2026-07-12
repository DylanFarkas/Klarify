import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { lightTheme } from "../theme";
import { fontFamily } from "../font";
import { GridBackground } from "../components/GridBackground";
import { CameraMotion } from "../components/CameraMotion";
import { Typewriter } from "../components/Typewriter";

const HEADLINE = "Transforma ideas en backlogs ejecutables";

export const Scene01LightIntro: React.FC = () => {
  const frame = useCurrentFrame();

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoY = interpolate(frame, [0, 20], [16, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [92, 112], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [92, 112], [14, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const flashOpacity = interpolate(frame, [102, 130], [0, 1], {
    easing: Easing.bezier(0.6, 0, 1, 0.4),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: lightTheme.background, fontFamily }}>
      <GridBackground theme={lightTheme} />

      <CameraMotion
        fromScale={0.94}
        toScale={1.05}
        toTranslate={[0, -14]}
        origin="50% 42%"
        frameRange={[0, 130]}
      >
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            padding: "0 220px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 44,
              opacity: logoOpacity,
              translate: `0 ${logoY}px`,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: lightTheme.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              K
            </div>
            <span
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: lightTheme.foreground,
                letterSpacing: "-0.02em",
              }}
            >
              Klarify
            </span>
          </div>

          <h1
            style={{
              fontSize: 104,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
              textAlign: "center",
              color: lightTheme.foreground,
              margin: 0,
            }}
          >
            <Typewriter
              text={HEADLINE}
              startFrame={12}
              framesPerChar={1.55}
              highlight="backlogs ejecutables"
              highlightColor={lightTheme.primary}
              caretColor={lightTheme.primary}
            />
          </h1>

          <p
            style={{
              marginTop: 40,
              fontSize: 34,
              lineHeight: 1.5,
              color: lightTheme.foregroundMuted,
              textAlign: "center",
              maxWidth: 1100,
              opacity: subtitleOpacity,
              translate: `0 ${subtitleY}px`,
            }}
          >
            Agentes de IA que convierten conversaciones y notas en un backlog
            listo para ejecutar.
          </p>
        </AbsoluteFill>
      </CameraMotion>

      <AbsoluteFill
        style={{ backgroundColor: "#ffffff", opacity: flashOpacity }}
      />
    </AbsoluteFill>
  );
};
