import type { CSSProperties, PropsWithChildren } from "react";
import type { Theme } from "../theme";

type CardProps = PropsWithChildren<{
  theme: Theme;
  style?: CSSProperties;
  accentBorder?: boolean;
}>;

export const Card: React.FC<CardProps> = ({
  theme,
  style,
  accentBorder,
  children,
}) => {
  return (
    <div
      style={{
        borderRadius: 20,
        backgroundColor: theme.surface,
        border: `1px solid ${accentBorder ? theme.primary : theme.border}`,
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.16)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
