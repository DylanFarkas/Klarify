import { Box, Text } from 'ink';
import { mixHex, TAGLINE, useTheme, type TuiColors } from '../theme';

/**
 * Wordmark de bloques para «klarify».
 *
 * `_` cavidad, `^` estante interno (▀ + fondo), `~` sombra.
 * El punto de la i es el acento de marca — no hay icono aparte.
 */
const GLYPHS: Record<string, readonly [string, string, string]> = {
  k: ['█  █', '█^^▄', '▀~~▀'],
  l: ['███ ', '███ ', '▀▀▀▀'],
  a: ['▄▀▀▄', '█^^█', '▀  ▀'],
  r: ['█▀▀█', '█^^▄', '▀~~▀'],
  i: [' █  ', '_█__', '▀▀▀ '],
  f: ['█▀▀▀', '█^^ ', '▀   '],
  y: ['█  █', ' ▀█ ', ' ▀  '],
};

const LETTERS = [...'klarify'] as const;
const GAP = ' ';
const BODY = [0, 1, 2].map((row) => LETTERS.map((ch) => GLYPHS[ch]![row]).join(GAP));
const MARK_WIDTH = BODY[0]!.length;
/** «ify» empieza en la i: 4 letras × 4 + 4 huecos. */
const SPLIT = 4 * 4 + 4;
/** Columna del palo de la i (` █  ` → índice 1 dentro del glifo). */
const SPARK_AT = SPLIT + 1;

function padLine(text: string, width: number): { left: number; right: number } {
  const extra = Math.max(0, width - text.length);
  const left = Math.floor(extra / 2);
  return { left, right: extra - left };
}

function tone(column: number, colors: TuiColors) {
  const right = column >= SPLIT;
  const fg = right ? colors.white : colors.steel;
  return {
    fg,
    cavity: mixHex(colors.bg, fg, right ? 0.16 : 0.22),
    shadow: mixHex(colors.bg, fg, right ? 0.38 : 0.48),
    bold: right,
  };
}

function Cell({ char, column }: { char: string; column: number }) {
  const { colors } = useTheme();
  const { fg, cavity, shadow, bold } = tone(column, colors);
  if (char === ' ') return <Text> </Text>;
  if (char === '_') {
    return (
      <Text backgroundColor={cavity} bold={bold}>
        {' '}
      </Text>
    );
  }
  if (char === '^') {
    return (
      <Text color={fg} backgroundColor={cavity} bold={bold}>
        ▀
      </Text>
    );
  }
  if (char === '~') return <Text color={shadow}>▀</Text>;
  return (
    <Text color={fg} bold={bold}>
      {char}
    </Text>
  );
}

function SparkLine({ width }: { width: number }) {
  const { colors } = useTheme();
  const raw = `${' '.repeat(SPARK_AT)}▄${' '.repeat(Math.max(0, MARK_WIDTH - SPARK_AT - 1))}`;
  const { left, right } = padLine(raw, width);
  return (
    <Text>
      {' '.repeat(left)}
      {[...raw].map((char, column) =>
        char === '▄' ? (
          <Text key={column} color={colors.accent} bold>
            ▄
          </Text>
        ) : (
          <Text key={column}> </Text>
        ),
      )}
      {' '.repeat(right)}
    </Text>
  );
}

function BodyLine({ text, width }: { text: string; width: number }) {
  const { left, right } = padLine(text, width);
  return (
    <Text>
      {' '.repeat(left)}
      {[...text].map((char, column) => (
        <Cell key={column} char={char} column={column} />
      ))}
      {' '.repeat(right)}
    </Text>
  );
}

function Tagline({ width }: { width: number }) {
  const { colors } = useTheme();
  const { left, right } = padLine(TAGLINE, width);
  return (
    <Text>
      {' '.repeat(left)}
      <Text color={colors.muted}>{TAGLINE}</Text>
      {' '.repeat(right)}
    </Text>
  );
}

/** Spark de marca para chrome compacto. */
export function BrandMark() {
  const { colors } = useTheme();
  return (
    <Text color={colors.accent} bold>
      ▄
    </Text>
  );
}

/** Lockup de producto: K de marca, como en el workspace web. */
export function BrandLockup({ tagline = false }: { tagline?: boolean }) {
  const { colors } = useTheme();
  return (
    <Box flexDirection="column">
      <Text>
        <Text bold color={colors.accent}>
          K
        </Text>
        <Text bold color={colors.white}>
          larify
        </Text>
      </Text>
      {tagline ? <Text color={colors.faint}>{TAGLINE}</Text> : null}
    </Box>
  );
}

export function Wordmark({
  columns,
  width,
}: {
  columns: number;
  width?: number;
}) {
  const { colors } = useTheme();
  const canvas = width ?? Math.min(columns, MARK_WIDTH);

  if (columns < 40) {
    const compact = '▄ klarify';
    const { left, right } = padLine(compact, canvas);
    return (
      <Box flexDirection="column" width={canvas} flexShrink={0}>
        <Text>
          {' '.repeat(left)}
          <Text color={colors.accent} bold>
            ▄
          </Text>
          <Text> </Text>
          <Text bold color={colors.steel}>
            klar
          </Text>
          <Text bold color={colors.white}>
            ify
          </Text>
          {' '.repeat(right)}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={canvas} flexShrink={0}>
      <SparkLine width={canvas} />
      {BODY.map((line, index) => (
        <BodyLine key={index} text={line} width={canvas} />
      ))}
      <Text>{' '.repeat(canvas)}</Text>
      <Tagline width={canvas} />
    </Box>
  );
}
