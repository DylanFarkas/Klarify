/**
 * @fileoverview ClarifyingQuestionsPanel — Wizard de discovery paso a paso.
 *
 * Flujo: Intro → una pregunta por pantalla → revisión → generar deseos.
 * Opciones propuestas por IA + "Otra opción" con texto libre.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  ClarificationAnswer,
  ClarifyingCategory,
  ClarifyingQuestion,
  ContextDiscovery,
} from '@/lib/types/agent-1';
import { OTHER_OPTION_ID, OTHER_OPTION_LABEL } from '@/lib/constants/agent-1';

interface ClarifyingQuestionsPanelProps {
  discovery: ContextDiscovery;
  answers: ClarificationAnswer[];
  onAnswerChange: (answers: ClarificationAnswer[]) => void;
  onSubmit: () => void;
  onSkip: () => void;
  isProcessing: boolean;
  error: string | null;
}

type WizardPhase = 'intro' | 'question' | 'review';

const CATEGORY_LABELS: Record<ClarifyingCategory, string> = {
  platform: 'Plataforma',
  users: 'Usuarios',
  scope: 'Alcance',
  business: 'Modelo de negocio',
  constraints: 'Restricciones',
};

function isAnswerValid(questionId: string, answers: ClarificationAnswer[]): boolean {
  const answer = answers.find((a) => a.questionId === questionId);
  if (!answer?.selectedOptionId) return false;
  if (answer.selectedOptionId === OTHER_OPTION_ID) {
    return Boolean(answer.customText?.trim());
  }
  return true;
}

function getInitialQuestionIndex(
  questions: ClarifyingQuestion[],
  answers: ClarificationAnswer[]
): number {
  const allValid = questions.every((q) => isAnswerValid(q.id, answers));
  if (allValid && questions.length > 0) return questions.length;

  const hasProgress = answers.some((a) => a.selectedOptionId);
  if (!hasProgress) return 0;

  const firstUnanswered = questions.findIndex((q) => !isAnswerValid(q.id, answers));
  return firstUnanswered === -1 ? questions.length : firstUnanswered;
}

function resolvePhase(
  showIntro: boolean,
  questionIndex: number,
  totalQuestions: number
): WizardPhase {
  if (showIntro) return 'intro';
  if (questionIndex >= totalQuestions) return 'review';
  return 'question';
}

function getAnswerLabel(
  question: ClarifyingQuestion,
  answers: ClarificationAnswer[]
): string | null {
  const answer = answers.find((a) => a.questionId === question.id);
  if (!answer?.selectedOptionId) return null;
  if (answer.selectedOptionId === OTHER_OPTION_ID) {
    return answer.customText?.trim() ?? null;
  }
  return question.options.find((o) => o.id === answer.selectedOptionId)?.label ?? null;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WizardSidebar({
  questions,
  answers,
  phase,
  questionIndex,
  onGoToQuestion,
}: {
  questions: ClarifyingQuestion[];
  answers: ClarificationAnswer[];
  phase: WizardPhase;
  questionIndex: number;
  onGoToQuestion: (index: number) => void;
}) {
  return (
    <aside className="hidden shrink-0 border-r border-border lg:block lg:w-56 xl:w-60">
      <div className="sticky top-0 px-3 py-4">
        <p className="mb-2 px-2 text-xs font-medium text-subtle">Progreso</p>
        <ol className="flex flex-col gap-0.5">
          {questions.map((question, index) => {
            const done = isAnswerValid(question.id, answers);
            const isCurrent = phase === 'question' && questionIndex === index;

            return (
              <li key={question.id}>
                <button
                  type="button"
                  onClick={() => done && onGoToQuestion(index)}
                  disabled={!done && !isCurrent}
                  className={[
                    'grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                    isCurrent
                      ? 'bg-surface-hover text-foreground'
                      : done
                        ? 'cursor-pointer text-muted hover:bg-surface-hover hover:text-foreground'
                        : 'cursor-default text-subtle',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold leading-none',
                      done
                        ? 'bg-success/15 text-success'
                        : isCurrent
                          ? 'bg-foreground text-background'
                          : 'border border-border text-subtle',
                    ].join(' ')}
                  >
                    {done ? <CheckIcon className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="min-w-0 truncate text-[13px] leading-5">
                    {CATEGORY_LABELS[question.category]}
                  </span>
                  <span className="col-start-2 line-clamp-2 text-[11px] leading-snug text-subtle">
                    {question.question}
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <div
              className={[
                'grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2.5 rounded-lg px-2 py-2',
                phase === 'review' ? 'bg-surface-hover text-foreground' : 'text-subtle',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  phase === 'review'
                    ? 'bg-foreground text-background'
                    : 'border border-border',
                ].join(' ')}
              >
                ✓
              </span>
              <span className="text-[13px] leading-5">Revisión final</span>
            </div>
          </li>
        </ol>
      </div>
    </aside>
  );
}

function OptionCard({
  label,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={[
        'group flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors',
        'cursor-pointer',
        selected
          ? 'border-border-strong bg-surface-hover'
          : 'border-border bg-surface hover:bg-surface-hover/60',
        disabled && 'cursor-not-allowed opacity-50',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
          selected
            ? 'border-foreground bg-foreground text-background'
            : 'border-border bg-surface group-hover:border-border-strong',
        ].join(' ')}
      >
        {selected ? <CheckIcon className="h-2.5 w-2.5" /> : null}
      </span>
      <span className="text-sm leading-snug text-foreground">{label}</span>
    </button>
  );
}

export function ClarifyingQuestionsPanel({
  discovery,
  answers,
  onAnswerChange,
  onSubmit,
  onSkip,
  isProcessing,
  error,
}: ClarifyingQuestionsPanelProps) {
  const questions = discovery.questions;
  const totalQuestions = questions.length;

  const [showIntro, setShowIntro] = useState(
    () => getInitialQuestionIndex(questions, answers) === 0 && !answers.some((a) => a.selectedOptionId)
  );
  const [questionIndex, setQuestionIndex] = useState(() =>
    getInitialQuestionIndex(questions, answers)
  );
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward');

  const phase = resolvePhase(showIntro, questionIndex, totalQuestions);
  const currentQuestion = phase === 'question' ? questions[questionIndex] : null;

  const answeredCount = useMemo(
    () => questions.filter((q) => isAnswerValid(q.id, answers)).length,
    [questions, answers]
  );

  const progressPercent =
    phase === 'intro'
      ? 0
      : phase === 'review'
        ? 100
        : ((questionIndex + 0.5) / totalQuestions) * 100;

  const currentAnswerValid = currentQuestion
    ? isAnswerValid(currentQuestion.id, answers)
    : false;

  const goForward = useCallback(() => {
    setSlideDirection('forward');
    if (showIntro) {
      setShowIntro(false);
      return;
    }
    if (questionIndex < totalQuestions) {
      setQuestionIndex((i) => i + 1);
    }
  }, [showIntro, questionIndex, totalQuestions]);

  const goBack = useCallback(() => {
    setSlideDirection('back');
    if (phase === 'review') {
      setQuestionIndex(totalQuestions - 1);
      return;
    }
    if (questionIndex === 0) {
      setShowIntro(true);
      return;
    }
    setQuestionIndex((i) => i - 1);
  }, [phase, questionIndex, totalQuestions]);

  const handleSelectOption = useCallback(
    (questionId: string, optionId: string) => {
      if (isProcessing) return;

      const existing = answers.filter((a) => a.questionId !== questionId);
      const prev = answers.find((a) => a.questionId === questionId);
      onAnswerChange([
        ...existing,
        {
          questionId,
          selectedOptionId: optionId,
          customText: optionId === OTHER_OPTION_ID ? prev?.customText ?? '' : undefined,
        },
      ]);
    },
    [answers, onAnswerChange, isProcessing]
  );

  const handleCustomTextChange = (questionId: string, customText: string) => {
    onAnswerChange(
      answers.map((a) => (a.questionId === questionId ? { ...a, customText } : a))
    );
  };

  const handleGoToQuestion = (index: number) => {
    setShowIntro(false);
    setSlideDirection(index < questionIndex ? 'back' : 'forward');
    setQuestionIndex(index);
  };

  const slideClass =
    slideDirection === 'forward'
      ? 'animate-[wizardSlideIn_0.3s_ease-out]'
      : 'animate-[wizardSlideInBack_0.3s_ease-out]';

  const primaryBtn =
    'inline-flex cursor-pointer items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40';
  const ghostBtn =
    'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3 md:px-5">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xs font-medium text-subtle">Definición del proyecto</span>
            {phase !== 'intro' ? (
              <>
                <span className="text-subtle" aria-hidden>
                  ·
                </span>
                <span className="truncate text-xs text-muted">
                  {phase === 'review'
                    ? 'Revisión'
                    : `Paso ${questionIndex + 1} de ${totalQuestions}`}
                </span>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onSkip}
            disabled={isProcessing}
            className="shrink-0 cursor-pointer text-xs font-medium text-subtle transition-colors hover:text-foreground disabled:opacity-50"
          >
            Saltar preguntas
          </button>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-foreground/70 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex min-h-100 flex-col lg:flex-row">
        <WizardSidebar
          questions={questions}
          answers={answers}
          phase={phase}
          questionIndex={questionIndex}
          onGoToQuestion={handleGoToQuestion}
        />

        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col px-4 py-5 md:px-6 md:py-6">
            {phase === 'intro' && (
              <div key="intro" className={`flex flex-1 flex-col ${slideClass}`}>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Afinemos tu proyecto
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                  {discovery.summary}
                </p>

                {discovery.gaps.length > 0 ? (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-medium text-subtle">Qué nos falta entender</p>
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {discovery.gaps.map((gap) => (
                        <li
                          key={gap}
                          className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-[13px] text-muted"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="mt-5 text-[13px] leading-relaxed text-muted">
                  Te haremos{' '}
                  <span className="font-medium text-foreground">
                    {totalQuestions} {totalQuestions === 1 ? 'pregunta' : 'preguntas'}
                  </span>{' '}
                  puntuales. Elige la opción que mejor encaje o escribe la tuya.
                </p>
              </div>
            )}

            {phase === 'question' && currentQuestion && (
              <div key={`q-${currentQuestion.id}`} className={`flex flex-1 flex-col ${slideClass}`}>
                <p className="mb-1.5 text-xs font-medium text-subtle">
                  {CATEGORY_LABELS[currentQuestion.category]}
                </p>

                <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
                  {currentQuestion.question}
                </h2>
                <p className="mt-1.5 text-[13px] text-muted">
                  Selecciona la opción que mejor describa tu caso.
                </p>

                <div className="mt-5 flex flex-col gap-2">
                  {currentQuestion.options.map((option) => (
                    <OptionCard
                      key={option.id}
                      label={option.label}
                      selected={
                        answers.find((a) => a.questionId === currentQuestion.id)?.selectedOptionId ===
                        option.id
                      }
                      disabled={isProcessing}
                      onSelect={() => handleSelectOption(currentQuestion.id, option.id)}
                    />
                  ))}

                  <OptionCard
                    label={OTHER_OPTION_LABEL}
                    selected={
                      answers.find((a) => a.questionId === currentQuestion.id)?.selectedOptionId ===
                      OTHER_OPTION_ID
                    }
                    disabled={isProcessing}
                    onSelect={() => handleSelectOption(currentQuestion.id, OTHER_OPTION_ID)}
                  />

                  {answers.find((a) => a.questionId === currentQuestion.id)?.selectedOptionId ===
                  OTHER_OPTION_ID ? (
                    <div className="mt-1">
                      <label className="mb-1.5 block text-xs text-subtle">
                        Describe tu respuesta
                      </label>
                      <textarea
                        className="min-h-22 w-full resize-y rounded-lg border border-input-border bg-input p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
                        placeholder="Escribe aquí tu respuesta personalizada…"
                        value={
                          answers.find((a) => a.questionId === currentQuestion.id)?.customText ?? ''
                        }
                        disabled={isProcessing}
                        autoFocus
                        onChange={(e) =>
                          handleCustomTextChange(currentQuestion.id, e.target.value)
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {phase === 'review' && (
              <div key="review" className={`flex flex-1 flex-col ${slideClass}`}>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Revisa tus respuestas
                </h2>
                <p className="mt-1.5 text-sm text-muted">
                  Confirma que todo esté correcto antes de generar los requerimientos.
                </p>

                <div className="mt-5 flex flex-col gap-1.5">
                  {questions.map((question, index) => {
                    const label = getAnswerLabel(question, answers);
                    return (
                      <div
                        key={question.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border px-3.5 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-subtle">
                            {CATEGORY_LABELS[question.category]}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-foreground">
                            {question.question}
                          </p>
                          <p className="mt-1.5 text-[13px] text-muted">
                            {label ?? (
                              <span className="italic text-subtle">Sin responder</span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGoToQuestion(index)}
                          className="shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                        >
                          Editar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error ? (
              <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2.5">
                <p className="text-sm text-danger">{error}</p>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 md:px-6">
            <button
              type="button"
              onClick={goBack}
              disabled={isProcessing || phase === 'intro'}
              className={[ghostBtn, phase === 'intro' ? 'invisible' : ''].join(' ')}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Anterior
            </button>

            {phase === 'intro' ? (
              <button type="button" onClick={goForward} disabled={isProcessing} className={primaryBtn}>
                Comenzar
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ) : null}

            {phase === 'question' ? (
              <button
                type="button"
                onClick={goForward}
                disabled={!currentAnswerValid || isProcessing}
                className={primaryBtn}
              >
                {questionIndex === totalQuestions - 1 ? 'Revisar respuestas' : 'Siguiente'}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ) : null}

            {phase === 'review' ? (
              <button
                type="button"
                onClick={onSubmit}
                disabled={answeredCount < totalQuestions || isProcessing}
                className={primaryBtn}
              >
                {isProcessing ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-background/30 border-t-background" />
                    Generando…
                  </>
                ) : (
                  <>
                    Generar deseos
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
