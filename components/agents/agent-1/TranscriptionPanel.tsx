/**
 * @fileoverview TranscriptionPanel — Panel de contexto (lado izquierdo).
 *
 * Muestra la transcripción o entrada original del usuario y, si hubo sesión
 * de preguntas de discovery, las respuestas de clarificación en paralelo
 * con el listado de deseos (CA2).
 */

'use client';

import { useMemo, useState } from 'react';
import type {
  ClarificationAnswer,
  ClarifyingCategory,
  ClarifyingQuestion,
  ContextDiscovery,
  TranscriptionResult,
} from '@/lib/types/agent-1';
import { formatTimestamp, OTHER_OPTION_ID } from '@/lib/constants/agent-1';

interface TranscriptionPanelProps {
  transcription: TranscriptionResult | null;
  discovery?: ContextDiscovery | null;
}

const CATEGORY_LABELS: Record<ClarifyingCategory, string> = {
  platform: 'Plataforma',
  users: 'Usuarios',
  scope: 'Alcance',
  business: 'Modelo de negocio',
  constraints: 'Restricciones',
};

function getAnswerLabel(
  question: ClarifyingQuestion,
  answer: ClarificationAnswer | undefined
): string | null {
  if (!answer?.selectedOptionId) return null;
  if (answer.selectedOptionId === OTHER_OPTION_ID) {
    return answer.customText?.trim() ?? null;
  }
  return question.options.find((o) => o.id === answer.selectedOptionId)?.label ?? null;
}

export function TranscriptionPanel({ transcription, discovery }: TranscriptionPanelProps) {
  const [showSegments, setShowSegments] = useState(true);

  const hasAudioMetadata = Boolean(
    transcription && (transcription.duration > 0 || transcription.segments.some((s) => s.speaker))
  );

  const clarificationEntries = useMemo(() => {
    if (!discovery?.questions.length) return [];

    return discovery.questions
      .map((question) => {
        const answer = discovery.answers.find((a) => a.questionId === question.id);
        const label = getAnswerLabel(question, answer);
        return label ? { question, answer: label } : null;
      })
      .filter((entry): entry is { question: ClarifyingQuestion; answer: string } => entry !== null);
  }, [discovery]);

  const hasClarifications = clarificationEntries.length > 0;
  const wasSkipped = discovery?.skipped === true;

  if (!transcription) {
    return (
      <section className="rounded-2xl border border-border bg-surface-muted p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-bold text-foreground">Contexto</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover">
            <svg
              className="h-7 w-7 text-icon-muted"
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
          <p className="text-sm text-subtle">
            El contexto aparecerá aquí una vez procesada la entrada.
          </p>
        </div>
      </section>
    );
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.95) return 'text-success';
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
      className="flex flex-col rounded-2xl border border-border bg-surface-muted backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]"
      aria-labelledby="context-heading"
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h3 id="context-heading" className="text-lg font-bold text-foreground">
            Contexto
          </h3>
          {transcription.duration > 0 && (
            <span className="rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-muted">
              {formatTimestamp(transcription.duration)}
            </span>
          )}
          {hasClarifications && (
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
              +{clarificationEntries.length} respuestas
            </span>
          )}
        </div>

        {hasAudioMetadata && (
          <button
            onClick={() => setShowSegments(!showSegments)}
            className="text-xs font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer"
          >
            {showSegments ? 'Ver texto completo' : 'Ver por segmentos'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[500px]">
        {/* Entrada original */}
        <div className="mb-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">
            Entrada original
          </p>

          {hasAudioMetadata && showSegments ? (
            <div className="flex flex-col gap-3">
              {transcription.segments.map((segment, index) => (
                <div
                  key={index}
                  className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-surface-hover"
                >
                  {segment.end > 0 && (
                    <span className="shrink-0 pt-0.5 text-xs font-mono text-subtle">
                      {formatTimestamp(segment.start)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    {segment.speaker && (
                      <span
                        className={[
                          'mb-1 inline-block text-xs font-bold',
                          segment.speaker === 'Cliente' ? 'text-primary' : 'text-muted',
                        ].join(' ')}
                      >
                        {segment.speaker}
                      </span>
                    )}
                    <p className="text-sm leading-relaxed text-body">{segment.text}</p>
                  </div>
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
            <div className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">
                {transcription.fullText}
              </p>
            </div>
          )}
        </div>

        {/* Respuestas de clarificación */}
        {hasClarifications && (
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">
              Respuestas de clarificación
            </p>
            <div className="flex flex-col gap-2">
              {clarificationEntries.map(({ question, answer }) => (
                <div
                  key={question.id}
                  className="rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {CATEGORY_LABELS[question.category]}
                  </span>
                  <p className="mt-1 text-xs leading-snug text-muted">{question.question}</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
                    {answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {wasSkipped && !hasClarifications && discovery?.questions.length ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 px-4 py-3">
            <p className="text-xs italic text-muted">
              Las preguntas de clarificación se omitieron. El contexto se basa solo en la entrada original.
            </p>
          </div>
        ) : null}
      </div>

      <div className="border-t border-border px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
          {hasAudioMetadata ? (
            <>
              <span>{transcription.segments.length} segmentos</span>
              <span>•</span>
            </>
          ) : null}
          <span>Idioma: {transcription.language.toUpperCase()}</span>
          {hasClarifications && (
            <>
              <span>•</span>
              <span>{clarificationEntries.length} respuestas añadidas</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
