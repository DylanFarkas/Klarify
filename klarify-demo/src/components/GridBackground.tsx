import { interpolate, useCurrentFrame } from "remotion";
import type { Theme } from "../theme";

type GridBackgroundProps = {
  theme: Theme;
  vignette?: string;
};

/**
 * Grid de puntos con parallax sutil, inspirado en `.workspace-grid` de la
 * app real (app/globals.css). Fondo puramente decorativo.
 */
export const GridBackground: React.FC<GridBackgroundProps> = ({
  theme,
  vignette,
}) => {
  const frame = useCurrentFrame();
  const gridSize = 64;

  const shiftDeep = interpolate(frame, [0, 900], [0, gridSize * 2]);
  const shiftNear = interpolate(frame, [0, 900], [gridSize, 0]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -gridSize * 2,
          backgroundImage: `linear-gradient(to right, ${theme.gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${theme.gridLine} 1px, transparent 1px)`,
          backgroundSize: `${gridSize * 2}px ${gridSize * 2}px`,
          translate: `${shiftDeep}px ${shiftDeep}px`,
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -gridSize,
          backgroundImage: `radial-gradient(circle, ${theme.gridDot} 1.5px, transparent 1.5px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          translate: `${shiftNear}px ${shiftNear}px`,
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 10%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 10%, transparent 72%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 90% 80% at 50% 40%, transparent 35%, ${
            vignette ?? theme.background
          } 100%)`,
        }}
      />
    </div>
  );
};
