import { Easing, interpolate, useCurrentFrame } from "remotion";

type CountUpProps = {
  from?: number;
  to: number;
  startFrame: number;
  durationInFrames?: number;
  style?: React.CSSProperties;
  suffix?: string;
};

export const CountUp: React.FC<CountUpProps> = ({
  from = 0,
  to,
  startFrame,
  durationInFrames = 30,
  style,
  suffix = "",
}) => {
  const frame = useCurrentFrame();
  const value = interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [from, to],
    {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return <span style={style}>{Math.round(value)}{suffix}</span>;
};
