/**
 * @fileoverview Página principal del Agente 1 — Ingesta de Contexto y Extracción.
 *
 * Orquesta el flujo completo del agente:
 *   1. Upload de archivo (drag & drop) o texto
 *   2. Transcripción
 *   3. Evaluación de contexto (discovery)
 *   4. Preguntas de clarificación (si hace falta)
 *   5. Extracción de deseos
 *   6. Review HITL + aprobación → Agente 2
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Agent1State,
  Agent1AnalyzeResponse,
  Agent1ExtractResponse,
  Agent1UploadResponse,
  ClarificationAnswer,
  TranscriptionResult,
  Wish,
} from '@/lib/types/agent-1';
import { WISH_ID_PREFIX } from '@/lib/constants/agent-1';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { authFetch } from '@/lib/api-client';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { FileUploader } from '@/components/agents/agent-1/FileUploader';
import { TranscriptionPanel } from '@/components/agents/agent-1/TranscriptionPanel';
import { WishesList } from '@/components/agents/agent-1/WishesList';
import { ClarifyingQuestionsPanel } from '@/components/agents/agent-1/ClarifyingQuestionsPanel';
import { AgentActivityModal } from '@/components/agents/shared/activity-log/AgentActivityModal';
import { LLMThinkingPanel } from '@/components/agents/shared/activity-log/LLMThinkingPanel';
import { ApproveButton } from '@/components/agents/shared/workflow/ApproveButton';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import { notifySuccess } from '@/lib/notifications/toast';

// ---------------------------------------------------------------------------
// Utilidades locales
// ---------------------------------------------------------------------------

function nextWishId(wishes: Wish[]): string {
  const maxNum = wishes.reduce((max, w) => {
    const num = parseInt(w.id.replace(`${WISH_ID_PREFIX}-`, ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `${WISH_ID_PREFIX}-${String(maxNum + 1).padStart(3, '0')}`;
}

function resolveHydratedStatus(a1: Agent1State): Agent1State['status'] {
  if (a1.status === 'approved') return 'approved';
  if (a1.wishes && a1.wishes.length > 0) return 'review';
  if (
    a1.discovery?.questions &&
    a1.discovery.questions.length > 0 &&
    !a1.discovery.completedAt
  ) {
    return 'clarifying';
  }
  if (a1.transcription?.fullText) return 'editing_transcription';
  return 'idle';
}

const INITIAL_STATE: Agent1State = {
  file: null,
  transcription: null,
  discovery: null,
  enrichedContext: null,
  wishes: [],
  status: 'idle',
  error: null,
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function Agent1Page() {
  const router = useRouter();
  const { user } = useAuth();
  const { workspace, isLoading, sessionVersion, saveAgent1, approveAgent1, resetAgent1 } = useWorkspace();
  const [state, setState] = useState<Agent1State>(INITIAL_STATE);
  const { entries, reset, consumeStream } = useAgentActivity();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { showModelReasoning } = useWorkspaceSettings();
  const isAgentWorking = state.status === 'assessing' || state.status === 'extracting';
  const activityModalOpen = isAgentWorking && showModelReasoning;

  // ── Hidratar desde el workspace (Firestore) ───────────────────
  useEffect(() => {
    if (isLoading || !workspace) return;

    const a1 = workspace.agent1;
    setState({
      file: a1.file ?? null,
      transcription: a1.transcription ?? null,
      discovery: a1.discovery ?? null,
      enrichedContext: a1.enrichedContext ?? null,
      wishes: a1.wishes ?? [],
      status: resolveHydratedStatus(a1),
      error: null,
    });
    setIsHydrated(true);
  }, [isLoading, workspace, sessionVersion]);

  // ── Redirigir si ya fue aprobado ──────────────────────────────
  useEffect(() => {
    if (!isHydrated || isLoading || !workspace) return;
    if (workspace.agent1.status === 'approved') {
      router.replace('/agentes/2');
    }
  }, [isHydrated, isLoading, workspace, router]);

  // ── Persistir en Firestore (debounced) ────────────────────────
  useEffect(() => {
    if (!isHydrated) return;
    if (state.transcription || state.discovery || state.wishes.length > 0) {
      saveAgent1({
        file: state.file,
        transcription: state.transcription,
        discovery: state.discovery,
        enrichedContext: state.enrichedContext,
        wishes: state.wishes,
        status: state.status,
        error: null,
      });
    }
  }, [
    state.transcription,
    state.discovery,
    state.enrichedContext,
    state.wishes,
    state.file,
    state.status,
    isHydrated,
    saveAgent1,
  ]);

  // ── Evaluar contexto tras transcripción ───────────────────────
  const handleAnalyzeContext = useCallback(
    async (transcription: TranscriptionResult) => {
      if (!user) return;

      setState((prev) => ({
        ...prev,
        transcription,
        status: 'assessing',
        discovery: null,
        enrichedContext: null,
        wishes: [],
        error: null,
      }));
      reset();

      try {
        const response = await authFetch('/api/agentes/1/analyze', user, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcription }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al analizar el contexto');
        }

        const data = await consumeStream<Agent1AnalyzeResponse>(response);

        if (data.discovery.isSufficient && data.wishes) {
          setState((prev) => ({
            ...prev,
            transcription,
            discovery: data.discovery,
            enrichedContext: data.enrichedContext ?? null,
            wishes: data.wishes ?? [],
            status: 'review',
            error: null,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            transcription,
            discovery: {
              ...data.discovery,
              answers: data.discovery.answers ?? [],
            },
            enrichedContext: null,
            wishes: [],
            status: 'clarifying',
            error: null,
          }));
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: 'editing_transcription',
          error: error instanceof Error ? error.message : 'Error desconocido al analizar.',
        }));
      }
    },
    [user, reset, consumeStream]
  );

  // ── Handler: Upload de archivo ────────────────────────────────
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!user) return;

      setState((prev) => ({
        ...prev,
        file: {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        },
        status: 'transcribing',
        error: null,
      }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await authFetch('/api/agentes/1/upload', user, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al procesar el archivo');
        }

        const data: Agent1UploadResponse = await response.json();
        await handleAnalyzeContext(data.transcription);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: 'idle',
          error: error instanceof Error ? error.message : 'Error desconocido al procesar.',
        }));
      }
    },
    [user, handleAnalyzeContext]
  );

  // ── Handler: Transcripción en vivo completada ─────────────────
  const handleLiveTranscriptionComplete = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      status: 'editing_transcription',
      transcription: {
        fullText: text,
        language: 'es',
        duration: 0,
        segments: [{ start: 0, end: 0, text, confidence: 1 }],
      },
      error: null,
    }));
  }, []);

  // ── Handler: Analizar contexto desde texto editado ──────────────
  const handleAnalyzeText = useCallback(
    async (finalText: string) => {
      if (!user || !finalText.trim()) return;

      const transcription: TranscriptionResult = {
        fullText: finalText.trim(),
        language: 'es',
        duration: 0,
        segments: [{ start: 0, end: 0, text: finalText.trim(), confidence: 1 }],
      };

      await handleAnalyzeContext(transcription);
    },
    [user, handleAnalyzeContext]
  );

  // ── Handler: Cambio de respuestas en clarificación ──────────────
  const handleAnswersChange = useCallback((answers: ClarificationAnswer[]) => {
    setState((prev) => ({
      ...prev,
      discovery: prev.discovery
        ? { ...prev.discovery, answers }
        : null,
      error: null,
    }));
  }, []);

  // ── Handler: Enviar respuestas y extraer deseos ─────────────────
  const handleSubmitAnswers = useCallback(async () => {
    if (!user || !state.transcription || !state.discovery) return;

    setState((prev) => ({ ...prev, status: 'extracting', error: null }));
    reset();

    try {
      const response = await authFetch('/api/agentes/1/extract', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcription: state.transcription,
          discovery: state.discovery,
          answers: state.discovery.answers,
          skipped: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al extraer deseos');
      }

      const data = await consumeStream<Agent1ExtractResponse>(response);

      setState((prev) => ({
        ...prev,
        discovery: prev.discovery
          ? { ...prev.discovery, completedAt: Date.now(), skipped: false }
          : null,
        enrichedContext: data.enrichedContext,
        wishes: data.wishes,
        status: 'review',
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'clarifying',
        error: error instanceof Error ? error.message : 'Error desconocido al extraer.',
      }));
    }
  }, [user, state.transcription, state.discovery, reset, consumeStream]);

  // ── Handler: Saltar clarificación ───────────────────────────────
  const handleSkipClarification = useCallback(async () => {
    if (!user || !state.transcription || !state.discovery) return;

    setState((prev) => ({ ...prev, status: 'extracting', error: null }));
    reset();

    try {
      const response = await authFetch('/api/agentes/1/extract', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcription: state.transcription,
          discovery: state.discovery,
          answers: [],
          skipped: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al extraer deseos');
      }

      const data = await consumeStream<Agent1ExtractResponse>(response);

      setState((prev) => ({
        ...prev,
        discovery: prev.discovery
          ? { ...prev.discovery, completedAt: Date.now(), skipped: true, answers: [] }
          : null,
        enrichedContext: data.enrichedContext,
        wishes: data.wishes,
        status: 'review',
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'clarifying',
        error: error instanceof Error ? error.message : 'Error desconocido al extraer.',
      }));
    }
  }, [user, state.transcription, state.discovery, reset, consumeStream]);

  // ── Handlers HITL: CRUD de deseos ─────────────────────────────

  const handleEditWish = useCallback((id: string, newText: string) => {
    setState((prev) => ({
      ...prev,
      wishes: prev.wishes.map((w) =>
        w.id === id ? { ...w, text: newText, isEdited: true } : w
      ),
    }));
    notifySuccess('Deseo actualizado');
  }, []);

  const handleDeleteWish = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      wishes: prev.wishes.filter((w) => w.id !== id),
    }));
    notifySuccess('Deseo eliminado');
  }, []);

  const handleAddWish = useCallback((text: string) => {
    setState((prev) => {
      const newWish: Wish = {
        id: nextWishId(prev.wishes),
        text,
        source: 'manual',
        isEdited: false,
        createdAt: Date.now(),
      };
      return { ...prev, wishes: [...prev.wishes, newWish] };
    });
    notifySuccess('Deseo creado');
  }, []);

  // ── Handler: Aprobar deseos ───────────────────────────────────
  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      const enrichedTranscription = state.transcription
        ? {
            ...state.transcription,
            fullText: state.enrichedContext ?? state.transcription.fullText,
          }
        : null;

      await approveAgent1({
        transcription: enrichedTranscription,
        wishes: state.wishes,
      });
      router.push('/agentes/2');
    } finally {
      setIsApproving(false);
    }
  }, [state.transcription, state.enrichedContext, state.wishes, approveAgent1, router]);

  // ── Handler: Reset ────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    await resetAgent1();
    setState(INITIAL_STATE);
  }, [resetAgent1]);

  const isRedirecting =
    isApproving ||
    (isHydrated && workspace?.agent1.status === 'approved');

  if (isLoading || !isHydrated || isRedirecting) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  const isReview = state.status === 'review';
  const wishCount = state.wishes.length;
  const answeredQuestions = state.discovery?.questions?.length ?? 0;

  return (
    <div
      className={[
        'mx-auto flex w-full animate-[fadeIn_0.3s_ease-out] flex-col gap-6 px-6 pt-3 pb-5',
        isReview ? 'max-w-5xl' : 'max-w-3xl',
      ].join(' ')}
    >
      <header className="border-b border-border/60 pb-3">
        <p className="text-[12px] text-subtle">Paso 1/6 · Captura</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          Ingesta de Contexto
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Comparte tu idea o la transcripción de una reunión. Analizamos el contexto, te hacemos
          unas preguntas rápidas si hace falta, y extraemos los requerimientos listos para revisar.
        </p>
        {isReview && wishCount > 0 ? (
          <p className="mt-2 text-[12px] text-muted">
            <span className="tabular-nums text-foreground">{wishCount}</span>
            {' '}
            {wishCount === 1 ? 'deseo extraído' : 'deseos extraídos'}
            {answeredQuestions > 0 ? (
              <>
                {' · '}
                <span className="tabular-nums text-foreground">{answeredQuestions}</span>
                {' '}
                {answeredQuestions === 1 ? 'pregunta respondida' : 'preguntas respondidas'}
              </>
            ) : null}
          </p>
        ) : null}
      </header>

      {/* Upload */}
      {(state.status === 'idle' ||
        state.status === 'uploading' ||
        state.status === 'transcribing') && (
        <FileUploader
          onFileSelect={handleFileUpload}
          onTranscriptionComplete={handleLiveTranscriptionComplete}
          isProcessing={state.status === 'transcribing'}
          error={state.error}
        />
      )}

      {/* Edición de transcripción */}
      {state.status === 'editing_transcription' && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border/60 px-4 py-3.5 md:px-5">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
              {state.transcription?.fullText ? 'Revisa y corrige tu grabación' : 'Escribe tus requerimientos'}
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              {state.transcription?.fullText
                ? 'Corrige la transcripción si hace falta. Luego analizamos el contexto y te guiamos con preguntas puntuales si es necesario.'
                : 'Describe tu proyecto o pega apuntes de una reunión. Cuando estés listo, analizamos el contexto.'}
            </p>
          </div>

          <div className="flex flex-col gap-4 px-4 py-4 md:px-5 md:py-5">
            <textarea
              className="min-h-55 w-full resize-y rounded-lg border border-input-border bg-input p-4 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
              placeholder="Ejemplo: Quiero una app para vender zapatos online con catálogo, carrito y pagos..."
              value={state.transcription?.fullText || ''}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  transcription: {
                    ...prev.transcription!,
                    fullText: e.target.value,
                    segments: [{ start: 0, end: 0, text: e.target.value, confidence: 1 }],
                  },
                }))
              }
            />

            {state.error && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2.5">
                <p className="text-sm text-danger">{state.error}</p>
              </div>
            )}

            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button
                onClick={handleReset}
                className="cursor-pointer rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Descartar y volver
              </button>
              <button
                onClick={() => handleAnalyzeText(state.transcription?.fullText || '')}
                disabled={!state.transcription?.fullText?.trim()}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-text disabled:opacity-40"
              >
                Analizar contexto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clarificación */}
      {state.status === 'clarifying' && state.discovery && (
        <ClarifyingQuestionsPanel
          discovery={state.discovery}
          answers={state.discovery.answers}
          onAnswerChange={handleAnswersChange}
          onSubmit={handleSubmitAnswers}
          onSkip={handleSkipClarification}
          isProcessing={false}
          error={state.error}
        />
      )}

      {/* Review */}
      {state.status === 'review' && (
        <>
          {state.file ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              <span className="font-medium text-foreground">{state.file.name}</span>
              <span className="text-subtle" aria-hidden>
                ·
              </span>
              <span className="text-success">Procesado</span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
            <TranscriptionPanel
              transcription={state.transcription}
              discovery={state.discovery}
            />
            <div className="order-first lg:order-0">
              <WishesList
                wishes={state.wishes}
                onEdit={handleEditWish}
                onDelete={handleDeleteWish}
                onAdd={handleAddWish}
                isApproved={false}
              />
            </div>
          </div>

          <div className="flex flex-col items-stretch justify-between gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
            <p className="text-[13px] text-subtle">
              Revisa los deseos antes de continuar al backlog.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <button
                onClick={handleReset}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Empezar de nuevo
              </button>
              <ApproveButton
                onClick={handleApprove}
                disabled={state.wishes.length === 0 || isApproving}
                label="Aprobar deseos y continuar"
              />
            </div>
          </div>
        </>
      )}

      {isAgentWorking && !showModelReasoning && (
        <LLMThinkingPanel
          title={
            state.status === 'extracting'
              ? 'Preparando tus requerimientos...'
              : 'Analizando tu idea...'
          }
          description={
            state.status === 'extracting'
              ? 'Estamos extrayendo y organizando los deseos de tu proyecto a partir del contexto.'
              : 'Estamos evaluando si tenemos suficiente contexto para armar tu backlog, o si necesitamos hacerte unas preguntas rápidas.'
          }
        />
      )}

      {showModelReasoning && (
        <AgentActivityModal
          open={activityModalOpen}
          isActive={isAgentWorking}
          title={
            state.status === 'extracting'
              ? 'Preparando tus requerimientos...'
              : 'Analizando tu idea...'
          }
          description={
            state.status === 'extracting'
              ? 'Estamos extrayendo y organizando los deseos de tu proyecto a partir del contexto.'
              : 'Estamos evaluando si tenemos suficiente contexto para armar tu backlog, o si necesitamos hacerte unas preguntas rápidas.'
          }
          entries={entries}
        />
      )}
    </div>
  );
}
