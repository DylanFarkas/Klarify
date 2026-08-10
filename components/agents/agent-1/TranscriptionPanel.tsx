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
      <section className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">Contexto</h3>
        <p className="mt-6 text-center text-sm text-muted">
          El contexto aparecerá aquí una vez procesada la entrada.
        </p>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col rounded-xl border border-border bg-surface"
      aria-labelledby="context-heading"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 md:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 id="context-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
            Contexto
          </h3>
          {hasClarifications ? (
            <span className="truncate text-[12px] text-subtle">
              +{clarificationEntries.length} respuestas
            </span>
          ) : null}
        </div>

        {hasAudioMetadata ? (
          <button
            type="button"
            onClick={() => setShowSegments(!showSegments)}
            className="shrink-0 cursor-pointer text-[12px] font-medium text-muted transition-colors hover:text-foreground"
          >
            {showSegments ? 'Texto completo' : 'Segmentos'}
          </button>
        ) : null}
      </div>

      <div className="max-h-140 flex-1 overflow-y-auto px-4 py-3.5 md:px-5">
        <div className="mb-5">
          <p className="mb-2 text-[11px] font-medium text-subtle">Entrada original</p>

          {hasAudioMetadata && showSegments ? (
            <div className="flex flex-col gap-2">
              {transcription.segments.map((segment, index) => (
                <div key={index} className="rounded-lg px-2.5 py-2 hover:bg-surface-hover/50">
                  {segment.end > 0 ? (
                    <span className="mb-0.5 block font-mono text-[11px] text-subtle">
                      {formatTimestamp(segment.start)}
                    </span>
                  ) : null}
                  {segment.speaker ? (
                    <span className="mb-0.5 block text-[11px] font-medium text-muted">
                      {segment.speaker}
                    </span>
                  ) : null}
                  <p className="text-[13px] leading-relaxed text-muted">{segment.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface px-3.5 py-3">
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
                {transcription.fullText}
              </p>
            </div>
          )}
        </div>

        {hasClarifications ? (
          <div>
            <p className="mb-2 text-[11px] font-medium text-subtle">Respuestas de clarificación</p>
            <div className="flex flex-col gap-1.5">
              {clarificationEntries.map(({ question, answer }) => (
                <div
                  key={question.id}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2.5"
                >
                  <p className="text-[11px] font-medium text-subtle">
                    {CATEGORY_LABELS[question.category]}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-muted">{question.question}</p>
                  <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-foreground">
                    {answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {wasSkipped && !hasClarifications && discovery?.questions.length ? (
          <div className="rounded-lg border border-dashed border-border px-3.5 py-2.5">
            <p className="text-[12px] italic text-subtle">
              Las preguntas se omitieron. El contexto se basa solo en la entrada original.
            </p>
          </div>
        ) : null}
      </div>

      <div className="border-t border-border px-4 py-2.5 md:px-5">
        <p className="text-[12px] text-subtle">
          Idioma: {transcription.language.toUpperCase()}
          {hasClarifications ? ` · ${clarificationEntries.length} respuestas` : ''}
        </p>
      </div>
    </section>
  );
}
