/**
 * @fileoverview TranscriptionPanel — Contexto de apoyo junto a los deseos.
 *
 * Muestra la entrada original y las respuestas de clarificación (CA2).
 * Visualmente es secundario: tipografía más pequeña y muted, sin competir
 * con la lista de deseos.
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
      <section className="rounded-xl border border-border bg-surface px-4 py-4">
        <h3 className="text-[13px] font-semibold tracking-tight text-muted">Contexto</h3>
        <p className="mt-3 text-[13px] text-subtle">
          El contexto aparecerá aquí una vez procesada la entrada.
        </p>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col rounded-xl bg-background/40"
      aria-labelledby="context-heading"
    >
      <div className="flex items-center justify-between gap-3 px-4 mt-3">
        <h3
          id="context-heading"
          className="text-[13px] font-semibold tracking-tight text-muted"
        >
          Contexto
        </h3>

        {hasAudioMetadata ? (
          <button
            type="button"
            onClick={() => setShowSegments(!showSegments)}
            className="shrink-0 cursor-pointer text-[12px] font-medium text-subtle transition-colors hover:text-foreground"
          >
            {showSegments ? 'Texto completo' : 'Segmentos'}
          </button>
        ) : null}
      </div>

      <div className="px-4 py-3">
        <p className="mb-1.5 text-[11px] text-subtle">Entrada</p>

        {hasAudioMetadata && showSegments ? (
          <div className="flex flex-col">
            {transcription.segments.map((segment, index) => (
              <div
                key={index}
                className={index > 0 ? 'border-t border-border/60 py-2' : 'py-0.5'}
              >
                {segment.end > 0 ? (
                  <span className="mb-0.5 block font-mono text-[11px] text-subtle">
                    {formatTimestamp(segment.start)}
                  </span>
                ) : null}
                {segment.speaker ? (
                  <span className="mb-0.5 block text-[11px] text-subtle">{segment.speaker}</span>
                ) : null}
                <p className="text-[13px] leading-relaxed text-muted">{segment.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
            {transcription.fullText}
          </p>
        )}

        {hasClarifications ? (
          <dl className="mt-4 border-t border-border/60 pt-3">
            {clarificationEntries.map(({ question, answer }) => (
              <div
                key={question.id}
                className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-1.5"
              >
                <dt className="truncate text-[12px] text-subtle">
                  {CATEGORY_LABELS[question.category]}
                </dt>
                <dd className="text-[13px] leading-snug text-muted">{answer}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {wasSkipped && !hasClarifications && discovery?.questions.length ? (
          <p className="mt-3 text-[12px] italic text-subtle">
            Las preguntas se omitieron. El contexto se basa solo en la entrada original.
          </p>
        ) : null}
      </div>
    </section>
  );
}
