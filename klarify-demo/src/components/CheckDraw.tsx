import { Easing, interpolate, useCurrentFrame } from "remotion";

type CheckDrawProps = {
  startFrame: number;
  size?: number;
  color: string;
  bg?: string;
};

/**
 * Checkmark circular que se dibuja con stroke-dashoffset a partir de
 * `startFrame`, mas un pop de fondo.
 */
export const CheckDraw: React.FC<CheckDrawProps> = ({
  startFrame,
  size = 28,
  color,
  bg,
}) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;

  const pop = interpolate(local, [0, 12], [0.5, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(local, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dash = interpolate(local, [4, 18], [16, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: bg ?? color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        opacity,
        scale: pop,
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8.5L6.2 11.5L13 4.5"
          stroke="#fff"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={16}
          strokeDashoffset={dash}
        />
      </svg>
    </div>
  );
};
