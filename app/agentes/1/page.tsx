/**
 * @fileoverview Página principal del Agente 1 — Ingesta de Contexto y Extracción.
 *
 * Orquesta el flujo completo del agente:
 *   1. Upload de archivo (drag & drop)
 *   2. Procesamiento (transcripción + extracción)
 *   3. Review (transcripción + deseos en paralelo — CA2)
 *   4. HITL: editar/añadir/eliminar deseos (CA3)
 *   5. Aprobar y continuar al Agente 2
 *
 * Estado persistido en Firestore (workspace del usuario) para no perder trabajo.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Agent1State, Wish, Agent1UploadResponse } from '@/lib/types/agent-1';
import { WISH_ID_PREFIX } from '@/lib/constants/agent-1';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { authFetch } from '@/lib/api-client';
import { FileUploader } from '@/components/agents/agent-1/FileUploader';
import { TranscriptionPanel } from '@/components/agents/agent-1/TranscriptionPanel';
import { WishesList } from '@/components/agents/agent-1/WishesList';
import { ApproveButton } from '@/components/agents/shared/ApproveButton';

// ---------------------------------------------------------------------------
// Utilidades locales
// ---------------------------------------------------------------------------

/** Genera el siguiente ID de deseo (DESEO-001, DESEO-002, ...) */
function nextWishId(wishes: Wish[]): string {
  const maxNum = wishes.reduce((max, w) => {
    const num = parseInt(w.id.replace(`${WISH_ID_PREFIX}-`, ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `${WISH_ID_PREFIX}-${String(maxNum + 1).padStart(3, '0')}`;
}

/** Estado inicial del agente */
const INITIAL_STATE: Agent1State = {
  file: null,
  transcription: null,
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
  const [isHydrated, setIsHydrated] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // ── Hidratar desde el workspace (Firestore) ───────────────────
  useEffect(() => {
    if (isLoading || !workspace) return;

    const a1 = workspace.agent1;
    setState({
      file: a1.file ?? null,
      transcription: a1.transcription ?? null,
      wishes: a1.wishes ?? [],
      status: a1.status === 'approved'
        ? 'approved'
        : a1.wishes && a1.wishes.length > 0
          ? 'review'
          : 'idle',
      error: null,
    });
    setIsHydrated(true);
  }, [isLoading, workspace, sessionVersion]);

  // ── Redirigir si ya fue aprobado (evita pantalla intermedia) ──
  useEffect(() => {
    if (!isHydrated || isLoading || !workspace) return;
    if (workspace.agent1.status === 'approved') {
      router.replace('/agentes/2');
    }
  }, [isHydrated, isLoading, workspace, router]);

  // ── Persistir en Firestore (debounced) ────────────────────────
  useEffect(() => {
    if (!isHydrated) return;
    if (state.transcription || state.wishes.length > 0) {
      saveAgent1({
        file: state.file,
        transcription: state.transcription,
        wishes: state.wishes,
        status: state.status,
        error: null,
      });
    }
  }, [state.transcription, state.wishes, state.file, state.status, isHydrated, saveAgent1]);

  // ── Handler: Upload de archivo ────────────────────────────────
  const handleFileUpload = useCallback(async (file: File) => {
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

      setState((prev) => ({
        ...prev,
        transcription: data.transcription,
        wishes: data.wishes,
        status: 'review',
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Error desconocido al procesar.',
      }));
    }
  }, [user]);

  // ── Handler: Transcripción en vivo completada ─────────────────
  const handleLiveTranscriptionComplete = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      status: 'editing_transcription',
      transcription: {
        fullText: text,
        language: 'es',
        duration: 0,
        segments: [{ start: 0, end: 0, text, confidence: 1 }]
      },
      error: null,
    }));
  }, []);

  // ── Handler: Analizar texto editado ───────────────────────────
  const handleAnalyzeText = useCallback(async (finalText: string) => {
    if (!user) return;

    setState((prev) => ({
      ...prev,
      status: 'extracting',
      error: null,
    }));

    try {
      const formData = new FormData();
      formData.append('text', finalText);

      const response = await authFetch('/api/agentes/1/upload', user, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar el texto');
      }

      const data: Agent1UploadResponse = await response.json();

      setState((prev) => ({
        ...prev,
        transcription: data.transcription,
        wishes: data.wishes,
        status: 'review',
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'editing_transcription',
        error: error instanceof Error ? error.message : 'Error desconocido al analizar.',
      }));
    }
  }, [user]);

  // ── Handlers HITL: CRUD de deseos (CA3) ───────────────────────

  const handleEditWish = useCallback((id: string, newText: string) => {
    setState((prev) => ({
      ...prev,
      wishes: prev.wishes.map((w) =>
        w.id === id ? { ...w, text: newText, isEdited: true } : w
      ),
    }));
  }, []);

  const handleDeleteWish = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      wishes: prev.wishes.filter((w) => w.id !== id),
    }));
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
  }, []);

  // ── Handler: Aprobar deseos ───────────────────────────────────
  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      await approveAgent1({
        transcription: state.transcription,
        wishes: state.wishes,
      });
      router.push('/agentes/2');
    } finally {
      setIsApproving(false);
    }
  }, [state.transcription, state.wishes, approveAgent1, router]);

  // ── Handler: Reset / Subir otro archivo ───────────────────────
  const handleReset = useCallback(async () => {
    await resetAgent1();
    setState(INITIAL_STATE);
  }, [resetAgent1]);

  const isRedirecting =
    isApproving ||
    (isHydrated && workspace?.agent1.status === 'approved');

  // ── Evitar flash de contenido antes de hidratar ───────────────
  if (isLoading || !isHydrated || isRedirecting) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      {/* ── Hero Header ───────────────────────────────────────── */}
      <div className="mb-2">
        <div className="mb-3 flex items-center gap-3 text-primary">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
            Paso 01 / 06
          </span>
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Ingesta de Contexto
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          Carga el audio o los documentos de tu reunión con el cliente para que
          la IA transcriba y extraiga sus necesidades de forma automática.
        </p>
      </div>

      {/* ── Sección de Upload ─────────────────────────────────── */}
      {(state.status === 'idle' || state.status === 'uploading' || state.status === 'transcribing' || state.status === 'extracting') && (
        <FileUploader
          onFileSelect={handleFileUpload}
          onTranscriptionComplete={handleLiveTranscriptionComplete}
          isProcessing={state.status === 'transcribing' || state.status === 'extracting'}
          error={state.error}
        />
      )}

      {/* ── Sección de Edición de Transcripción (HITL Pre-análisis) ── */}
      {state.status === 'editing_transcription' && (
        <div className="animate-[fadeIn_0.3s_ease-out] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border bg-primary/5 px-6 py-5 md:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-hover">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {state.transcription?.fullText ? 'Revisa y corrige tu grabación' : 'Escribe tus requerimientos'}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {state.transcription?.fullText
                    ? 'Asegúrate de que la transcripción sea correcta antes de enviarla a Gemini para extraer los requerimientos. Puedes añadir detalles o corregir palabras mal interpretadas.'
                    : 'Escribe aquí el texto, apuntes o requerimientos que tengas de tu reunión. Cuando estés listo, envíalos a Gemini para procesarlos.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 p-6 md:p-8">
            <textarea
              className="min-h-[220px] w-full resize-y rounded-xl border border-input-border bg-input p-5 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder={state.transcription?.fullText ? '' : 'Ejemplo: Necesito una aplicación móvil que tenga inicio de sesión con Google...'}
              value={state.transcription?.fullText || ''}
              onChange={(e) => setState(prev => ({
                ...prev,
                transcription: {
                  ...prev.transcription!,
                  fullText: e.target.value,
                  segments: [{ start: 0, end: 0, text: e.target.value, confidence: 1 }]
                }
              }))}
            />

            {state.error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-danger">{state.error}</p>
              </div>
            )}

            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <button
                onClick={handleReset}
                className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-muted transition-all hover:bg-surface-hover hover:text-foreground cursor-pointer"
              >
                Descartar y volver
              </button>
              <button
                onClick={() => handleAnalyzeText(state.transcription?.fullText || '')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-bold text-white shadow-[0_4px_20px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition-all hover:bg-primary-hover hover:shadow-[0_6px_28px_color-mix(in_srgb,var(--primary)_45%,transparent)] cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Analizar texto con Gemini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resultados: Transcripción + Deseos en paralelo (CA2) ── */}
      {state.status === 'review' && (
        <>
          {/* Info del archivo procesado */}
          {state.file && (
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface-muted px-5 py-4 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/15 text-lg">
                {state.file.name.endsWith('.mp3') || state.file.name.endsWith('.wav') ? '🎵' : '📄'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{state.file.name}</p>
                <p className="text-xs text-muted">
                  Procesado exitosamente
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-success/30 bg-success/15 px-3 py-1 text-xs font-bold text-success">
                ✓ Listo
              </span>
            </div>
          )}

          {/* Grid de transcripción + deseos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TranscriptionPanel transcription={state.transcription} />
            <WishesList
              wishes={state.wishes}
              onEdit={handleEditWish}
              onDelete={handleDeleteWish}
              onAdd={handleAddWish}
              isApproved={false}
            />
          </div>

          {/* ── Barra de acciones ─────────────────────────────── */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-surface-muted px-6 py-5 sm:flex-row">
            <button
              onClick={handleReset}
              className={[
                'inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3',
                'text-sm font-medium text-muted',
                'hover:border-border-strong hover:bg-surface-hover hover:text-foreground',
                'transition-all cursor-pointer',
              ].join(' ')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Subir otro archivo
            </button>

            <ApproveButton
              onClick={handleApprove}
              disabled={state.wishes.length === 0 || isApproving}
              label="Aprobar Deseos y Continuar"
            />
          </div>
        </>
      )}
    </div>
  );
}