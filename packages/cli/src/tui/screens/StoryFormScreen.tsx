import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { createStory, getStory, updateStory } from '../../core/services';
import type { BacklogEpic, BacklogStory, CreateStoryInput } from '../../core/types';
import { useTheme } from '../theme';

type Field = 'epic' | 'title' | 'description' | 'ac' | 'subtasks' | 'category' | 'points' | 'save';

const FIELDS: Field[] = ['epic', 'title', 'description', 'ac', 'subtasks', 'category', 'points', 'save'];
const CATEGORIES = ['must', 'should', 'could', 'wont'];

export function StoryFormScreen({
  projectId,
  epics,
  mode,
  storyId,
  story,
  defaultEpicId,
  onDone,
  onCancel,
  onError,
}: {
  projectId: string;
  epics: BacklogEpic[];
  mode: 'create' | 'edit';
  storyId?: string;
  story?: BacklogStory;
  defaultEpicId?: string;
  onDone: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const { colors } = useTheme();
  const [field, setField] = useState<Field>(mode === 'create' ? 'epic' : 'title');
  const [epicIndex, setEpicIndex] = useState(() => {
    const idx = epics.findIndex((epic) => epic.id === (story?.epicId ?? defaultEpicId));
    return idx >= 0 ? idx : 0;
  });
  const [title, setTitle] = useState(story?.title ?? '');
  const [description, setDescription] = useState(story?.description ?? '');
  const [ac, setAc] = useState<string[]>(story?.acceptanceCriteria ?? []);
  const [acDraft, setAcDraft] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>((story?.subtasks ?? []).map((item) => item.title));
  const [subDraft, setSubDraft] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(() => {
    const cat = CATEGORIES.indexOf(story?.priority ?? '');
    return cat >= 0 ? cat : 0;
  });
  const [points, setPoints] = useState(story?.points != null ? String(story.points) : '');
  const [loaded, setLoaded] = useState(mode === 'create' || Boolean(story));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== 'edit' || !storyId || loaded) return;
    void getStory(projectId, storyId)
      .then(({ story: fetched }) => {
        if (!fetched) return;
        setTitle(fetched.title);
        setDescription(fetched.description);
        setAc(fetched.acceptanceCriteria ?? []);
        setSubtasks((fetched.subtasks ?? []).map((item) => item.title));
        const cat = CATEGORIES.indexOf(fetched.priority ?? '');
        setCategoryIndex(cat >= 0 ? cat : 0);
        setPoints(fetched.points != null ? String(fetched.points) : '');
        const idx = epics.findIndex((epic) => epic.id === fetched.epicId);
        if (idx >= 0) setEpicIndex(idx);
        setLoaded(true);
      })
      .catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)));
  }, [mode, storyId, loaded, projectId, epics, onError]);

  const fieldIndex = FIELDS.indexOf(field);

  function nextField(delta: number) {
    const next = (fieldIndex + delta + FIELDS.length) % FIELDS.length;
    setField(FIELDS[next]!);
  }

  async function save() {
    const epic = epics[epicIndex];
    if (!epic) {
      onError('Necesitas una épica. Crea una antes.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      onError('Título y descripción son obligatorios.');
      return;
    }
    if (ac.length === 0) {
      onError('Añade al menos un criterio de aceptación (enter en el campo).');
      return;
    }
    setSaving(true);
    try {
      const body: CreateStoryInput = {
        epicId: epic.id,
        title: title.trim(),
        description: description.trim(),
        acceptanceCriteria: ac,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
        category: CATEGORIES[categoryIndex],
        points: points.trim() ? Number(points) : undefined,
      };
      if (mode === 'create') await createStory(projectId, body);
      else if (storyId) {
        await updateStory(projectId, storyId, {
          title: body.title,
          description: body.description,
          acceptanceCriteria: body.acceptanceCriteria,
          subtasks: body.subtasks,
          category: body.category,
          points: body.points,
          epicId: body.epicId,
        });
      }
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  useInput((input, key) => {
    if (saving) return;
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.ctrl && input === 's') {
      void save();
      return;
    }
    if (key.tab) {
      nextField(key.shift ? -1 : 1);
      return;
    }
    if (field === 'epic') {
      if (key.downArrow || input === 'j') setEpicIndex((value) => Math.min(epics.length - 1, value + 1));
      if (key.upArrow || input === 'k') setEpicIndex((value) => Math.max(0, value - 1));
      if (key.return) nextField(1);
      return;
    }
    if (field === 'category') {
      if (key.downArrow || input === 'j') setCategoryIndex((value) => Math.min(CATEGORIES.length - 1, value + 1));
      if (key.upArrow || input === 'k') setCategoryIndex((value) => Math.max(0, value - 1));
      if (key.return) nextField(1);
      return;
    }
    if (field === 'save' && key.return) void save();
  }, {
    isActive: field === 'epic' || field === 'category' || field === 'save' || true,
  });

  const label = (id: Field, text: string) => (
    <Text color={field === id ? colors.primaryHi : colors.muted} bold={field === id}>
      {field === id ? '> ' : '  '}
      {text}
    </Text>
  );

  if (!loaded) {
    return (
      <Box padding={1}>
        <Text color={colors.muted}>Cargando historia…</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} gap={0} flexGrow={1}>
      <Text bold color={colors.primaryHi}>
        {mode === 'create' ? 'Nueva historia' : `Editar ${storyId}`}
      </Text>
      {label('epic', 'Épica')}
      {epics.map((epic, index) => (
        <Text key={epic.id} color={index === epicIndex ? colors.ink : colors.faint}>
          {index === epicIndex && field === 'epic' ? '  * ' : '    '}
          {epic.id}  {epic.title}
        </Text>
      ))}
      {label('title', 'Título')}
      {field === 'title' ? (
        <TextInput
          key="title"
          placeholder="Registro con email"
          defaultValue={title}
          onChange={setTitle}
          onSubmit={() => nextField(1)}
        />
      ) : (
        <Text color={colors.ink}>    {title || '—'}</Text>
      )}
      {label('description', 'Descripción')}
      {field === 'description' ? (
        <TextInput
          key="description"
          placeholder="Como usuario, quiero…"
          defaultValue={description}
          onChange={setDescription}
          onSubmit={() => nextField(1)}
        />
      ) : (
        <Text color={colors.ink} wrap="truncate">
          {'    '}
          {description || '—'}
        </Text>
      )}
      {label('ac', 'Criterios (enter añade)')}
      {ac.map((line, index) => (
        <Text key={`ac-${index}`} color={colors.ink} wrap="truncate">
          {'    '}
          {index + 1}. {line}
        </Text>
      ))}
      {field === 'ac' ? (
        <TextInput
          key={`ac-${ac.length}`}
          placeholder="Dado… cuando… entonces…"
          defaultValue={acDraft}
          onChange={setAcDraft}
          onSubmit={(value) => {
            const trimmed = value.trim();
            if (trimmed) {
              setAc((list) => [...list, trimmed]);
              setAcDraft('');
            } else nextField(1);
          }}
        />
      ) : null}
      {label('subtasks', 'Subtareas (enter añade)')}
      {subtasks.map((line, index) => (
        <Text key={`st-${index}`} color={colors.muted}>
          {'    '}
          [ ] {line}
        </Text>
      ))}
      {field === 'subtasks' ? (
        <TextInput
          key={`st-${subtasks.length}`}
          placeholder="Implementar formulario"
          defaultValue={subDraft}
          onChange={setSubDraft}
          onSubmit={(value) => {
            const trimmed = value.trim();
            if (trimmed) {
              setSubtasks((list) => [...list, trimmed]);
              setSubDraft('');
            } else nextField(1);
          }}
        />
      ) : null}
      {label('category', 'Prioridad')}
      <Text color={colors.ink}>
        {'    '}
        {CATEGORIES.map((item, index) => (index === categoryIndex ? `[${item}]` : item)).join('  ')}
      </Text>
      {label('points', 'Puntos')}
      {field === 'points' ? (
        <TextInput
          key="points"
          placeholder="3"
          defaultValue={points}
          onChange={setPoints}
          onSubmit={() => nextField(1)}
        />
      ) : (
        <Text color={colors.ink}>    {points || '—'}</Text>
      )}
      {label('save', saving ? 'Guardando…' : 'Guardar')}
      <Text color={colors.faint} wrap="wrap">
        tab campo · enter en criterio/subtarea añade · ctrl+s guarda · esc cancela
      </Text>
    </Box>
  );
}
