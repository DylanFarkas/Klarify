import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { PropsWithChildren } from "react";

type CameraMotionProps = PropsWithChildren<{
  fromScale?: number;
  toScale?: number;
  fromTranslate?: [number, number];
  toTranslate?: [number, number];
  origin?: string;
  frameRange?: [number, number];
  easing?: (input: number) => number;
}>;

/**
 * Wrapper cinematico reutilizable: anima scale + translate de todo su
 * contenido para simular un movimiento de camara (zoom/pan) sutil.
 */
export const CameraMotion: React.FC<CameraMotionProps> = ({
  children,
  fromScale = 1,
  toScale = 1.06,
  fromTranslate = [0, 0],
  toTranslate = [0, 0],
  origin = "50% 50%",
  frameRange,
  easing = Easing.bezier(0.16, 1, 0.3, 1),
}) => {
  const frame = useCurrentFrame();
  const [startFrame, endFrame] = frameRange ?? [0, 90];

  const progressInput = [startFrame, endFrame];

  const scale = interpolate(frame, progressInput, [fromScale, toScale], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateX = interpolate(
    frame,
    progressInput,
    [fromTranslate[0], toTranslate[0]],
    { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const translateY = interpolate(
    frame,
    progressInput,
    [fromTranslate[1], toTranslate[1]],
    { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        scale,
        translate: `${translateX}px ${translateY}px`,
        transformOrigin: origin,
      }}
    >
      {children}
    </div>
  );
};
