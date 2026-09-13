import { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  AGENT_THEMES,
  KLARIFY_ACCENTS,
  type AgentTheme,
  type KlarifyAccent,
} from '../../core/theme-ids';
import { Hairline, Hints, Landing } from '../components/Landing';
import { clampWidth, landingInner, pageGutter } from '../layout';
import { useTheme } from '../theme';

export function ThemeScreen({
  columns,
  rows,
  showBrand,
  onBack,
}: {
  columns: number;
  rows: number;
  showBrand: boolean;
  onBack: () => void;
}) {
  const { theme, accent, colors, setTheme, setAccent, persistAppearance } = useTheme();
  const committed = useRef({ theme, accent });
  const [index, setIndex] = useState(() =>
    Math.max(0, AGENT_THEMES.findIndex((item) => item.id === theme)),
  );
  const [accentIndex, setAccentIndex] = useState(() =>
    Math.max(0, KLARIFY_ACCENTS.findIndex((item) => item.id === accent)),
  );
  const pad = pageGutter(columns);
  const width = clampWidth(56, columns);
  const selected = AGENT_THEMES[index]!;
  const isKlarify = selected.id === 'klarify';

  useEffect(() => {
    const nextTheme: AgentTheme = AGENT_THEMES[index]!.id;
    if (nextTheme !== theme) setTheme(nextTheme);
  }, [index, setTheme, theme]);

  useEffect(() => {
    if (!isKlarify) return;
    const nextAccent: KlarifyAccent = KLARIFY_ACCENTS[accentIndex]!.id;
    if (nextAccent !== accent) setAccent(nextAccent);
  }, [accent, accentIndex, isKlarify, setAccent]);

  useInput((input, key) => {
    if (key.ctrl) return;
    if (key.escape || input === 'q') {
      setTheme(committed.current.theme);
      setAccent(committed.current.accent);
      onBack();
      return;
    }
    if (key.downArrow || input === 'j') {
      setIndex((value) => Math.min(AGENT_THEMES.length - 1, value + 1));
      return;
    }
    if (key.upArrow || input === 'k') {
      setIndex((value) => Math.max(0, value - 1));
      return;
    }
    if (isKlarify && (key.rightArrow || input === 'l' || input === 'L')) {
      setAccentIndex((value) => (value + 1) % KLARIFY_ACCENTS.length);
      return;
    }
    if (isKlarify && (key.leftArrow || input === 'h' || input === 'H')) {
      setAccentIndex((value) => (value - 1 + KLARIFY_ACCENTS.length) % KLARIFY_ACCENTS.length);
      return;
    }
    if (key.return) {
      const nextTheme = AGENT_THEMES[index]!.id;
      const nextAccent = nextTheme === 'klarify' ? KLARIFY_ACCENTS[accentIndex]!.id : committed.current.accent;
      void persistAppearance(nextTheme, nextAccent).then(() => onBack());
    }
  });

  const list = (
    <Box flexDirection="column">
      {AGENT_THEMES.map((item, i) => {
        const isSelected = i === index;
        const saved = item.id === committed.current.theme;
        const swatch = item.id === 'klarify' ? KLARIFY_ACCENTS[accentIndex]!.primary : item.preview.accent;
        return (
          <Box
            key={item.id}
            width={showBrand ? landingInner(columns) : width}
            justifyContent="space-between"
            backgroundColor={isSelected ? colors.surfaceHi : undefined}
          >
            <Box>
              <Text color={isSelected ? colors.accent : colors.faint}>{isSelected ? '●' : ' '}</Text>
              <Text color={isSelected ? colors.white : colors.ink} bold={isSelected}>
                {'  '}
                {item.label}
              </Text>
              {saved ? <Text color={colors.faint}>  ·  actual</Text> : null}
            </Box>
            <Text color={swatch}>●</Text>
          </Box>
        );
      })}
      {isKlarify ? (
        <Box flexDirection="column" marginTop={1}>
          <Hairline width={showBrand ? landingInner(columns) : width} />
          <Box marginTop={1}>
            <Text color={colors.faint}>Acento  </Text>
            <Text color={colors.accent} bold>
              {KLARIFY_ACCENTS[accentIndex]!.label}
            </Text>
          </Box>
          <Box marginTop={1}>
            {KLARIFY_ACCENTS.map((item, i) => (
              <Text key={item.id} color={item.primary}>
                {i === accentIndex ? '●' : '○'}
                {i < KLARIFY_ACCENTS.length - 1 ? ' ' : ''}
              </Text>
            ))}
          </Box>
        </Box>
      ) : null}
    </Box>
  );

  const hints = (
    <Hints
      items={
        isKlarify
          ? [
              ['j/k', 'tema'],
              ['h/l', 'acento'],
              ['enter', 'guardar'],
              ['esc', 'cancelar'],
            ]
          : [
              ['j/k', 'tema'],
              ['enter', 'guardar'],
              ['esc', 'cancelar'],
            ]
      }
    />
  );

  if (showBrand) {
    return (
      <Landing
        columns={columns}
        rows={rows}
        title="Tema"
        meta="Misma paleta que el workspace web. Enter la deja fija."
        showPath={false}
        hints={hints}
      >
        {list}
      </Landing>
    );
  }

  return (
    <Box
      width={columns}
      flexGrow={1}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor={colors.bg}
      paddingX={pad}
    >
      <Box width={width} flexDirection="column">
        <Text bold color={colors.white}>
          Tema
        </Text>
        <Box marginTop={1}>
          <Text color={colors.muted}>Los mismos presets que el workspace web.</Text>
        </Box>
        <Box marginTop={1} marginBottom={1}>
          <Hairline width={width} />
        </Box>
        {list}
        <Box marginTop={2}>{hints}</Box>
      </Box>
    </Box>
  );
}
