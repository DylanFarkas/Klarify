import { useMemo, useState, type ReactNode } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import { Spinner, TextInput } from '@inkjs/ui';
import { createProject, useProject } from '../../core/services';
import type { LiveBacklog, ProjectSummary, Whoami } from '../../core/types';
import { Hairline, Hints, Landing, PipelineDots } from '../components/Landing';
import {
  dotsFilled,
  formatPlanName,
  formatRelativeDate,
  maxProjectsOf,
  stageFromProject,
} from '../pipeline';
import { viewport } from '../layout';
import { useTheme } from '../theme';

function tableColumns(width: number) {
  const showDate = width >= 72;
  const showCta = width >= 58;
  const showDots = width >= 52;
  const showBadge = width >= 44;
  const badgeW = showBadge ? 10 : 0;
  const dateW = showDate ? 7 : 0;
  const dotsW = showDots ? 16 : 0;
  const ctaW = showCta ? 11 : 0;
  const stageW = width >= 88 ? 22 : Math.max(10, Math.min(16, Math.floor(width * 0.18)));
  const gaps = 2 + (showBadge ? 2 : 0) + 2 + (showDots ? 2 : 0) + (showDate ? 2 : 0) + (showCta ? 2 : 0);
  const nameW = Math.min(28, Math.max(10, width - (2 + badgeW + stageW + dotsW + dateW + ctaW + gaps)));
  const tableW = Math.min(
    width,
    2 +
      nameW +
      (showBadge ? 2 + badgeW : 0) +
      2 +
      stageW +
      (showDots ? 2 + dotsW : 0) +
      (showDate ? 2 + dateW : 0) +
      (showCta ? 2 + ctaW : 0),
  );
  return { showDate, showCta, showDots, showBadge, badgeW, dateW, dotsW, ctaW, stageW, nameW, tableW };
}

function Gap() {
  return <Text>  </Text>;
}

function Col({
  width,
  children,
}: {
  width: number;
  children?: ReactNode;
}) {
  return (
    <Box width={width} flexShrink={0} overflow="hidden" flexDirection="row">
      {children ?? <Text> </Text>}
    </Box>
  );
}

export function ProjectsScreen({
  projects,
  activeProjectId,
  instantOpenId,
  me,
  error,
  onPicked,
  onQuit,
  onBack,
  onError,
  onTheme,
}: {
  projects: ProjectSummary[];
  activeProjectId: string | null;
  instantOpenId?: string | null;
  me?: Whoami | null;
  error?: string | null;
  onPicked: (projectId: string, backlog?: LiveBacklog) => void;
  onQuit: () => void;
  onBack?: () => void;
  onError: (message: string) => void;
  onTheme?: () => void;
}) {
  const { colors } = useTheme();
  const { columns, rows } = useWindowSize();
  const view = viewport(columns, rows);
  const { inner: mainW, cards, compact, short } = view;
  const [creating, setCreating] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [index, setIndex] = useState(() => {
    const found = projects.findIndex((item) => item.id === activeProjectId);
    return found >= 0 ? found : 0;
  });
  const stride = compact ? 1 : 2;
  const chrome = short ? 8 : compact ? 11 : 16;
  const visible = Math.min(14, Math.max(2, Math.floor((rows - chrome) / stride)));
  const cols = tableColumns(mainW);
  const selected = projects[index];

  const windowed = useMemo(() => {
    if (projects.length === 0) return [];
    const start = index >= visible ? index - visible + 1 : 0;
    return projects.slice(start, start + visible).map((item, offset) => ({
      item,
      index: start + offset,
    }));
  }, [projects, index, visible]);

  const activeCount = projects.filter((item) => item.status !== 'locked').length;
  const cap = maxProjectsOf(me?.plan.limits);
  const planName = formatPlanName(me?.plan.id);
  const aside = [planName ? `Plan ${planName}` : null, cap ? `${projects.length}/${cap}` : `${projects.length} proyecto${projects.length === 1 ? '' : 's'}`]
    .filter(Boolean)
    .join('  ·  ');

  const meta =
    projects.length === 0
      ? 'Cada proyecto conserva su propio pipeline. Crea el primero para empezar.'
      : `Cada proyecto conserva su propio pipeline  ·  ${activeCount} activo${activeCount === 1 ? '' : 's'}`;

  useInput((_, key) => {
    if (key.escape) setCreating(false);
  }, { isActive: creating });

  useInput((input, key) => {
    if (key.ctrl) return;
    if (picking) return;
    if (input === 't' && onTheme) {
      onTheme();
      return;
    }
    if (key.escape) {
      if (onBack) onBack();
      else onQuit();
      return;
    }
    if (input === 'q') {
      onQuit();
      return;
    }
    if (input === 'n') {
      setCreating(true);
      return;
    }
    if (key.downArrow || input === 'j') {
      setIndex((value) => Math.min(Math.max(0, projects.length - 1), value + 1));
      return;
    }
    if (key.upArrow || input === 'k') {
      setIndex((value) => Math.max(0, value - 1));
      return;
    }
    if (key.return) {
      const project = projects[index];
      if (!project || project.status === 'locked') return;
      if (project.id === instantOpenId) {
        onPicked(project.id);
        return;
      }
      setPicking(project.id);
      void (async () => {
        try {
          const used = await useProject(project.id);
          onPicked(project.id, used.backlog);
        } catch (err) {
          setPicking(null);
          onError(err instanceof Error ? err.message : String(err));
        }
      })();
    }
  }, { isActive: !creating });

  const body = creating ? (
    <Box flexDirection="column">
      <Text color={colors.muted}>Nombre del proyecto</Text>
      <Box marginTop={1} width={Math.min(48, mainW)}>
        <TextInput
          placeholder="Mi producto"
          onSubmit={(name) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            void (async () => {
              try {
                const created = await createProject(trimmed);
                const used = await useProject(created.project.id);
                onPicked(created.project.id, used.backlog);
              } catch (err) {
                onError(err instanceof Error ? err.message : String(err));
                setCreating(false);
              }
            })();
          }}
        />
      </Box>
    </Box>
  ) : projects.length === 0 ? (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold color={colors.white}>
        Crea tu primer proyecto
      </Text>
      <Box marginTop={1}>
        <Text color={colors.muted}>Un proyecto es un pipeline propio. Pulsa n para empezar.</Text>
      </Box>
    </Box>
  ) : cards ? (
    <Box flexDirection="column" width={mainW} overflow="hidden">
      {windowed.map(({ item, index: rowIndex }) => {
        const isSelected = rowIndex === index;
        const isActive = item.id === activeProjectId;
        const locked = item.status === 'locked';
        const nameColor = locked ? colors.faint : isSelected ? colors.white : colors.ink;
        const badge = locked ? 'Bloqueado' : isActive ? 'Actual' : picking === item.id ? 'abriendo…' : null;
        const bits = [
          item.pipelineLabel,
          typeof item.completionPercentage === 'number' ? `${item.completionPercentage}%` : null,
          formatRelativeDate(item.updatedAt) || null,
        ].filter(Boolean);
        return (
          <Box
            key={item.id}
            flexDirection="column"
            width={mainW}
            marginBottom={compact ? 0 : 1}
            paddingX={1}
            backgroundColor={isSelected ? colors.surface : undefined}
            overflow="hidden"
          >
            <Box overflow="hidden">
              <Text color={isSelected || isActive ? colors.accent : colors.faint}>
                {isSelected || isActive ? '●' : '○'}
              </Text>
              <Text bold={isSelected || isActive} color={nameColor} wrap="truncate">
                {' '}
                {item.name}
              </Text>
              {badge ? (
                <Text color={locked ? colors.faint : colors.accent} wrap="truncate">
                  {'  '}
                  {badge}
                </Text>
              ) : null}
            </Box>
            <Box paddingLeft={2} overflow="hidden">
              <Text color={locked ? colors.faint : colors.muted} wrap="truncate">
                {bits.join('  ·  ')}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  ) : (
    <Box flexDirection="column" overflow="hidden">
      <Box flexDirection="row" marginBottom={1} overflow="hidden">
        <Col width={2 + cols.nameW}>
          <Text color={colors.faint}>PROYECTO</Text>
        </Col>
        {cols.showBadge ? (
          <>
            <Gap />
            <Col width={cols.badgeW} />
          </>
        ) : null}
        <Gap />
        <Col width={cols.stageW}>
          <Text color={colors.faint}>ETAPA</Text>
        </Col>
        {cols.showDots ? (
          <>
            <Gap />
            <Col width={cols.dotsW}>
              <Text color={colors.faint}>PROGRESO</Text>
            </Col>
          </>
        ) : null}
        {cols.showDate ? (
          <>
            <Gap />
            <Col width={cols.dateW}>
              <Text color={colors.faint}>FECHA</Text>
            </Col>
          </>
        ) : null}
      </Box>
      <Hairline width={cols.tableW} />
      <Box height={compact ? 0 : 1} />
      {windowed.map(({ item, index: rowIndex }) => {
        const isSelected = rowIndex === index;
        const isActive = item.id === activeProjectId;
        const locked = item.status === 'locked';
        const nameColor = locked ? colors.faint : isSelected ? colors.white : colors.ink;
        const metaColor = locked ? colors.faint : colors.muted;
        return (
          <Box key={item.id} marginBottom={compact ? 0 : 1}>
            <Box
              flexDirection="row"
              width={cols.tableW}
              flexShrink={0}
              backgroundColor={isSelected ? colors.surface : undefined}
              overflow="hidden"
            >
              <Col width={2}>
                <Text color={isSelected || isActive ? colors.accent : colors.faint}>
                  {isSelected || isActive ? '●' : '○'}
                </Text>
              </Col>
              <Col width={cols.nameW}>
                <Text bold={isSelected || isActive} color={nameColor} wrap="truncate">
                  {item.name}
                </Text>
              </Col>
              {cols.showBadge ? (
                <>
                  <Gap />
                  <Col width={cols.badgeW}>
                    {isActive && !locked ? (
                      <Text color={colors.accent}>Actual</Text>
                    ) : locked ? (
                      <Text color={colors.faint}>Bloqueado</Text>
                    ) : null}
                  </Col>
                </>
              ) : null}
              <Gap />
              <Col width={cols.stageW}>
                <Text color={metaColor} wrap="truncate">
                  {item.pipelineLabel}
                </Text>
              </Col>
              {cols.showDots ? (
                <>
                  <Gap />
                  <Col width={cols.dotsW}>
                    <PipelineDots filled={dotsFilled(item)} />
                    {typeof item.completionPercentage === 'number' ? (
                      <Text color={colors.faint}>  {item.completionPercentage}%</Text>
                    ) : null}
                  </Col>
                </>
              ) : null}
              {cols.showDate ? (
                <>
                  <Gap />
                  <Col width={cols.dateW}>
                    <Text color={colors.faint}>{formatRelativeDate(item.updatedAt)}</Text>
                  </Col>
                </>
              ) : null}
              {cols.showCta ? (
                <>
                  <Gap />
                  <Col width={cols.ctaW}>
                    {picking === item.id ? (
                      <Spinner label="abrir" />
                    ) : isSelected && !locked ? (
                      <Box paddingX={1} backgroundColor={colors.ink}>
                        <Text color={colors.bg} bold>
                          abrir
                        </Text>
                      </Box>
                    ) : (
                      <Text> </Text>
                    )}
                  </Col>
                </>
              ) : null}
            </Box>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Landing
      columns={columns}
      rows={rows}
      title={creating ? 'Nuevo proyecto' : 'Proyectos'}
      meta={creating ? 'El proyecto nuevo queda activo y abre el backlog.' : meta}
      aside={aside}
      error={error}
      stage={creating ? null : stageFromProject(selected)}
      showPath={!creating && projects.length > 0}
      hints={
        creating ? (
          <Hints items={[['enter', 'crear'], ['esc', 'volver']]} />
        ) : (
          <Hints
            items={
              short || mainW < 48
                ? [
                    ['j/k', 'mover'],
                    ['enter', picking ? 'abriendo…' : 'abrir'],
                    ['n', 'nuevo'],
                    [onBack ? 'esc' : 'q', onBack ? 'atrás' : 'salir'],
                  ]
                : [
                    ['j/k', 'mover'],
                    ['enter', picking ? 'abriendo…' : 'abrir'],
                    ['n', 'nuevo'],
                    ['t', 'tema'],
                    ['ctrl+p', 'comandos'],
                    [onBack ? 'esc' : 'q', onBack ? 'atrás' : 'salir'],
                  ]
            }
          />
        )
      }
    >
      {body}
    </Landing>
  );
}
