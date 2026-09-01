import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { useState } from 'react';
import { createEpic } from '../../core/services';
import { colors } from '../theme';

export function EpicFormScreen({
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
  const [step, setStep] = useState<'title' | 'description'>('title');
  const [title, setTitle] = useState('');

  useInput((_, key) => {
    if (key.escape) onCancel();
  });

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text bold color={colors.primaryHi}>
        Nueva épica
      </Text>
      {step === 'title' ? (
        <>
          <Text color={colors.muted}>Título</Text>
          <TextInput
            placeholder="Onboarding"
            onSubmit={(value) => {
              if (!value.trim()) return;
              setTitle(value.trim());
              setStep('description');
            }}
          />
        </>
      ) : (
        <>
          <Text color={colors.ink}>{title}</Text>
          <Text color={colors.muted}>Descripción</Text>
          <TextInput
            placeholder="Qué cubre esta épica"
            onSubmit={(value) => {
              if (!value.trim()) return;
              void createEpic(projectId, { title, description: value.trim() })
                .then(() => onDone())
                .catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)));
            }}
          />
        </>
      )}
      <Text color={colors.faint}>enter siguiente · esc cancelar</Text>
    </Box>
  );
}
