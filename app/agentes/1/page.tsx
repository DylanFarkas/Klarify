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
 * Estado persistido en localStorage para no perder trabajo al refrescar.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Agent1State, Wish, Agent1UploadResponse } from '@/lib/types/agent-1';
import { WISH_ID_PREFIX, STORAGE_KEY_AGENT_1 } from '@/lib/constants/agent-1';
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
  const [state, setState] = useState<Agent1State>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // ── Hidratar desde localStorage ───────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AGENT_1);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Agent1State>;
        setState((prev) => ({
          ...prev,
          transcription: parsed.transcription || null,
          wishes: parsed.wishes || [],
          file: parsed.file || null,
          // Si hay datos guardados, ir a review; si fue aprobado, mantenerlo
          status: parsed.status === 'approved'
            ? 'approved'
            : parsed.wishes && parsed.wishes.length > 0
              ? 'review'
              : 'idle',
        }));
      }
    } catch {
      // localStorage corrupto — usar estado inicial
    }
    setIsHydrated(true);
  }, []);

  // ── Persistir en localStorage ─────────────────────────────────
  useEffect(() => {
    if (!isHydrated) return;
    if (state.transcription || state.wishes.length > 0) {
      localStorage.setItem(
        STORAGE_KEY_AGENT_1,
        JSON.stringify({
          transcription: state.transcription,
          wishes: state.wishes,
          file: state.file,
          status: state.status,
        })
      );
    }
  }, [state.transcription, state.wishes, state.file, state.status, isHydrated]);

  // ── Handler: Upload de archivo ────────────────────────────────
  const handleFileUpload = useCallback(async (file: File) => {
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

      const response = await fetch('/api/agentes/1/upload', {
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
  }, []);

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
  const handleApprove = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'approved' }));
    // TODO: Navegar al Agente 2 cuando esté implementado
  }, []);

  // ── Handler: Reset / Subir otro archivo ───────────────────────
  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_AGENT_1);
    setState(INITIAL_STATE);
  }, []);

  // ── Evitar flash de contenido antes de hidratar ───────────────
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#005BBF]" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8">
      {/* ── Título y descripción ──────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white md:text-3xl tracking-[-0.03em]">
          Ingesta de Contexto
        </h1>
        <p className="text-base text-white/60 max-w-2xl">
          Carga el audio o los documentos de tu reunión con el cliente para que
          la IA transcriba y extraiga sus necesidades de forma automática.
        </p>
      </div>

      {/* ── Sección de Upload ─────────────────────────────────── */}
      {(state.status === 'idle' || state.status === 'uploading' || state.status === 'transcribing' || state.status === 'extracting') && (
        <FileUploader
          onFileSelect={handleFileUpload}
          isProcessing={state.status === 'transcribing' || state.status === 'extracting'}
          error={state.error}
        />
      )}

      {/* ── Resultados: Transcripción + Deseos en paralelo (CA2) ── */}
      {(state.status === 'review' || state.status === 'approved') && (
        <>
          {/* Info del archivo procesado */}
          {state.file && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#005BBF]/20 text-sm">
                {state.file.name.endsWith('.mp3') || state.file.name.endsWith('.wav') ? '🎵' : '📄'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{state.file.name}</p>
                <p className="text-xs text-white/40">
                  Procesado exitosamente
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#22C55E]/20 px-2.5 py-0.5 text-xs font-bold text-[#22C55E]">
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
              isApproved={state.status === 'approved'}
            />
          </div>

          {/* ── Barra de acciones ─────────────────────────────── */}
          {state.status === 'review' && (
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <button
                onClick={handleReset}
                className={[
                  'inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3',
                  'text-sm font-medium text-white/60',
                  'hover:border-white/25 hover:text-white hover:bg-white/[0.05]',
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
                disabled={state.wishes.length === 0}
                label="Aprobar Deseos y Continuar"
              />
            </div>
          )}

          {/* ── Mensaje de aprobación ─────────────────────────── */}
          {state.status === 'approved' && (
            <div className="flex items-center gap-3 rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/10 px-5 py-4 animate-[fadeIn_0.3s_ease-out]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22C55E]/20">
                <svg className="h-5 w-5 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#22C55E]">
                  ¡Deseos aprobados exitosamente!
                </p>
                <p className="text-xs text-[#22C55E]/70">
                  {state.wishes.length} deseos listos. Siguiente paso → Agente 2: Análisis de Necesidades.
                </p>
              </div>

              {/* Botón para resetear y volver a empezar */}
              <button
                onClick={handleReset}
                className="ml-auto shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                Nueva sesión
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
