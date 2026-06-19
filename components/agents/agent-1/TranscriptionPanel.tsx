/**
 * @fileoverview TranscriptionPanel — Panel de transcripción (lado izquierdo).
 *
 * Muestra la transcripción completa con indicadores de confianza por segmento,
 * timestamps y diferenciación visual por hablante. El contenido aparece con
 * una animación de fade-in al recibir datos.
 *
 * Cumple CA2: Mostrar la transcripción en paralelo con el listado de deseos.
 */

'use client';

import { useState } from 'react';
import type { TranscriptionResult } from '@/lib/types/agent-1';
import { formatTimestamp } from '@/lib/constants/agent-1';

interface TranscriptionPanelProps {
  /** Resultado de la transcripción (null si aún no se procesó) */
  transcription: TranscriptionResult | null;
}

export function TranscriptionPanel({ transcription }: TranscriptionPanelProps) {
  const [showSegments, setShowSegments] = useState(true);

  // ── Estado vacío ──────────────────────────────────────────────
  if (!transcription) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-bold text-white">Transcripción</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
            <svg
              className="h-7 w-7 text-white/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <p className="text-sm text-white/40">
            La transcripción aparecerá aquí una vez procesado el archivo.
          </p>
        </div>
      </section>
    );
  }

  // ── Color de confianza ────────────────────────────────────────
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.95) return 'text-[#22C55E]';
    if (confidence >= 0.9) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.95) return 'Alta';
    if (confidence >= 0.9) return 'Media';
    return 'Baja';
  };

  return (
    <section
      className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]"
      aria-labelledby="transcription-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <h3 id="transcription-heading" className="text-lg font-bold text-white">
            Transcripción
          </h3>
          {transcription.duration > 0 && (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
              {formatTimestamp(transcription.duration)}
            </span>
          )}
        </div>

        {/* Toggle vista */}
        <button
          onClick={() => setShowSegments(!showSegments)}
          className="text-xs font-medium text-[#005BBF] hover:text-[#3d8fe8] transition-colors cursor-pointer"
        >
          {showSegments ? 'Ver texto completo' : 'Ver por segmentos'}
        </button>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[500px]">
        {showSegments ? (
          // ── Vista por segmentos ──
          <div className="flex flex-col gap-3">
            {transcription.segments.map((segment, index) => (
              <div
                key={index}
                className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.03]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Timestamp */}
                {segment.end > 0 && (
                  <span className="shrink-0 pt-0.5 text-xs font-mono text-white/30">
                    {formatTimestamp(segment.start)}
                  </span>
                )}

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  {/* Speaker badge */}
                  {segment.speaker && (
                    <span
                      className={[
                        'mb-1 inline-block text-xs font-bold',
                        segment.speaker === 'Cliente' ? 'text-[#005BBF]' : 'text-white/50',
                      ].join(' ')}
                    >
                      {segment.speaker}
                    </span>
                  )}
                  <p className="text-sm leading-relaxed text-white/80">
                    {segment.text}
                  </p>
                </div>

                {/* Indicador de confianza */}
                <div
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title={`Confianza: ${Math.round(segment.confidence * 100)}%`}
                >
                  <span className={`text-[10px] font-bold ${getConfidenceColor(segment.confidence)}`}>
                    {getConfidenceLabel(segment.confidence)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // ── Vista texto completo ──
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
            {transcription.fullText}
          </div>
        )}
      </div>

      {/* Footer con stats */}
      <div className="border-t border-white/10 px-6 py-3">
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span>{transcription.segments.length} segmentos</span>
          <span>•</span>
          <span>Idioma: {transcription.language.toUpperCase()}</span>
          <span>•</span>
          <span>
            Confianza promedio:{' '}
            {Math.round(
              (transcription.segments.reduce((sum, s) => sum + s.confidence, 0) /
                transcription.segments.length) *
                100
            )}
            %
          </span>
        </div>
      </div>
    </section>
  );
}
