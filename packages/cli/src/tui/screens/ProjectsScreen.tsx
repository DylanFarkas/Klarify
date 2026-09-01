import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { createProject, useProject } from '../../core/services';
import type { ProjectSummary } from '../../core/types';
import { SelectList } from '../components/SelectList';
import { colors } from '../theme';

export function ProjectsScreen({
  projects,
  activeProjectId,
  listHeight,
  onPicked,
  onQuit,
  onError,
}: {
  projects: ProjectSummary[];
  activeProjectId: string | null;
  listHeight: number;
  onPicked: (projectId: string) => void;
  onQuit: () => void;
  onError: (message: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [creating, setCreating] = useState(false);

  useInput((_, key) => {
    if (key.escape) setCreating(false);
  }, { isActive: creating });

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onQuit();
      return;
    }
    if (input === 'n') {
      setCreating(true);
      return;
    }
    if (key.downArrow || input === 'j') {
      setIndex((value) => Math.min(projects.length - 1, value + 1));
      return;
    }
    if (key.upArrow || input === 'k') {
      setIndex((value) => Math.max(0, value - 1));
      return;
    }
    if (key.return) {
      const project = projects[index];
      if (!project) return;
      void (async () => {
        try {
          await useProject(project.id);
          onPicked(project.id);
        } catch (err) {
          onError(err instanceof Error ? err.message : String(err));
        }
      })();
    }
  }, { isActive: !creating });

  if (creating) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color={colors.primaryHi}>
          Nuevo proyecto
        </Text>
        <TextInput
          placeholder="Nombre"
          onSubmit={(name) => {
            void (async () => {
              try {
                const created = await createProject(name.trim());
                await useProject(created.project.id);
                onPicked(created.project.id);
              } catch (err) {
                onError(err instanceof Error ? err.message : String(err));
                setCreating(false);
              }
            })();
          }}
        />
        <Text color={colors.faint}>enter crear · el proyecto queda activo</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} gap={1} flexGrow={1}>
      <Text bold color={colors.primaryHi}>
        Proyectos
      </Text>
      <SelectList
        items={projects}
        selectedIndex={index}
        focused
        height={listHeight}
        getKey={(item) => item.id}
        empty="No hay proyectos. Pulsa n para crear uno."
        renderRow={(item) => (
          <Text>
            <Text color={item.id === activeProjectId ? colors.success : colors.muted}>
              {item.id === activeProjectId ? '* ' : '  '}
            </Text>
            <Text color={colors.ink}>{item.name}</Text>
            <Text color={colors.faint}>  {item.pipelineLabel}</Text>
          </Text>
        )}
      />
      <Text color={colors.faint}>j/k mover · enter usar · n nuevo · q salir</Text>
    </Box>
  );
}
