import { useCurrentFrame } from "remotion";

type TypewriterProps = {
  text: string;
  startFrame: number;
  framesPerChar?: number;
  style?: React.CSSProperties;
  highlight?: string;
  highlightColor?: string;
  caretColor?: string;
};

/**
 * Efecto de maquina de escribir con highlight en cursiva sobre un segmento
 * del texto, igual al patron usado en el hero real de la landing.
 */
export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  startFrame,
  framesPerChar = 1.6,
  style,
  highlight,
  highlightColor = "#005bbf",
  caretColor = "#005bbf",
}) => {
  const frame = useCurrentFrame();
  const local = Math.max(0, frame - startFrame);
  const typedLength = Math.min(text.length, Math.floor(local / framesPerChar));
  const visible = text.slice(0, typedLength);
  const isDone = typedLength >= text.length;
  const caretVisible = Math.floor(frame / 15) % 2 === 0;

  if (!highlight) {
    return (
      <span style={style}>
        {visible}
        {!isDone && (
          <span
            style={{
              display: "inline-block",
              width: "0.08em",
              height: "0.9em",
              marginLeft: "0.12em",
              background: caretColor,
              verticalAlign: "-0.08em",
              opacity: caretVisible ? 1 : 0,
            }}
          />
        )}
      </span>
    );
  }

  const highlightStart = text.indexOf(highlight);
  const highlightEnd = highlightStart + highlight.length;

  const before = visible.slice(0, Math.min(typedLength, highlightStart));
  const mid = visible.slice(
    Math.min(typedLength, highlightStart),
    Math.min(typedLength, highlightEnd),
  );
  const after = visible.slice(Math.min(typedLength, highlightEnd));

  return (
    <span style={style}>
      {before}
      <span style={{ fontStyle: "italic", color: highlightColor }}>{mid}</span>
      {after}
      <span
        style={{
          display: "inline-block",
          width: "0.08em",
          height: "0.9em",
          marginLeft: "0.12em",
          background: caretColor,
          verticalAlign: "-0.08em",
          opacity: isDone ? (caretVisible ? 1 : 0) : caretVisible ? 1 : 0,
        }}
      />
    </span>
  );
};
