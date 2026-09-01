import { readFile, rm } from 'node:fs/promises';
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { importBacklog } from '../../core/services';
import { colors } from '../theme';

type Preview = { epics: number; stories: number; path: string; payload: unknown };

export function ImportScreen({
  projectId,
  onDone,
  onCancel,
  onError,
}: {
  projectId: string;
  onDone: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rmAfter, setRmAfter] = useState(true);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (!preview) return;
    if (input === 'r') setRmAfter((value) => !value);
    if (input === 'y' || key.return) {
      void (async () => {
        try {
          await importBacklog(projectId, preview.payload);
          if (rmAfter) await rm(preview.path, { force: true });
          onDone();
        } catch (err) {
          onError(err instanceof Error ? err.message : String(err));
        }
      })();
    }
  });

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text bold color={colors.primaryHi}>
        Importar backlog
      </Text>
      <Text color={colors.muted}>JSON con {'{ "epics": [...] }'}. Equivale a `klarify backlog import`.</Text>
      {!preview ? (
        <>
          <TextInput
            placeholder="ruta/al/backlog.json"
            onSubmit={(path) => {
              void (async () => {
                try {
                  const raw = await readFile(path.trim(), 'utf8');
                  const payload = JSON.parse(raw) as { epics?: unknown[] };
                  const epics = Array.isArray(payload.epics) ? payload.epics : [];
                  const stories = epics.reduce<number>((sum, epic) => {
                    const storiesInEpic =
                      epic && typeof epic === 'object' && 'stories' in epic && Array.isArray(epic.stories)
                        ? epic.stories.length
                        : 0;
                    return sum + storiesInEpic;
                  }, 0);
                  if (epics.length === 0) {
                    onError('El JSON no tiene épicas.');
                    return;
                  }
                  setPreview({ epics: epics.length, stories, path: path.trim(), payload });
                } catch (err) {
                  onError(err instanceof Error ? err.message : String(err));
                }
              })();
            }}
          />
          <Text color={colors.faint}>enter previsualizar · esc cancelar</Text>
        </>
      ) : (
        <>
          <Text color={colors.ink}>
            {preview.epics} épicas · {preview.stories} historias
          </Text>
          <Text color={colors.muted}>{preview.path}</Text>
          <Text color={rmAfter ? colors.warn : colors.muted}>
            Borrar archivo tras importar: {rmAfter ? 'sí' : 'no'} (r)
          </Text>
          <Text color={colors.faint}>enter / y importar · r toggle borrar · esc cancelar</Text>
        </>
      )}
    </Box>
  );
}
