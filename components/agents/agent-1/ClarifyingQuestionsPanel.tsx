/**
 * @fileoverview ClarifyingQuestionsPanel — Wizard de discovery paso a paso.
 *
 * Flujo: Intro → una pregunta por pantalla → revisión → generar deseos.
 * Opciones propuestas por IA + "Otra opción" con texto libre.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

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
    <aside className="hidden shrink-0 border-r border-border bg-surface-muted/50 lg:block lg:w-64 xl:w-72">
      <div className="sticky top-0 p-6">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted">
          Progreso
        </p>
        <ol className="flex flex-col gap-1">
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
                    'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                    isCurrent
                      ? 'bg-primary/10 text-foreground'
                      : done
                        ? 'cursor-pointer text-body hover:bg-surface-hover'
                        : 'cursor-default text-muted',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                      done
                        ? 'bg-success/20 text-success'
                        : isCurrent
                          ? 'bg-primary text-white'
                          : 'border border-border bg-surface text-muted',
                    ].join(' ')}
                  >
                    {done ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {CATEGORY_LABELS[question.category]}
                    </span>
                    <span className="line-clamp-2 text-xs leading-snug">
                      {question.question}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <div
              className={[
                'flex items-center gap-3 rounded-xl px-3 py-2.5',
                phase === 'review' ? 'bg-primary/10 text-foreground' : 'text-muted',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  phase === 'review'
                    ? 'bg-primary text-white'
                    : 'border border-border bg-surface',
                ].join(' ')}
              >
                ✓
              </span>
              <span className="text-xs font-medium">Revisión final</span>
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
        'group relative flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all duration-200',
        'cursor-pointer hover:border-primary/40 hover:shadow-sm',
        selected
          ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_30%,transparent)]'
          : 'border-border bg-surface',
        disabled && 'opacity-60 cursor-not-allowed',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          selected
            ? 'border-primary bg-primary text-white'
            : 'border-border bg-surface group-hover:border-primary/50',
        ].join(' ')}
      >
        {selected && <CheckIcon className="h-3 w-3" />}
      </span>
      <span className="text-sm font-medium leading-snug text-foreground">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

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
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

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

      if (optionId !== OTHER_OPTION_ID && phase === 'question' && questionId === currentQuestion?.id) {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = setTimeout(() => {
          setSlideDirection('forward');
          setQuestionIndex((i) => {
            const next = i + 1;
            return next <= totalQuestions ? next : i;
          });
        }, 450);
      }
    },
    [answers, onAnswerChange, isProcessing, phase, currentQuestion?.id, totalQuestions]
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
      ? 'animate-[wizardSlideIn_0.35s_ease-out]'
      : 'animate-[wizardSlideInBack_0.35s_ease-out]';

  return (
    <div className="animate-[fadeIn_0.3s_ease-out] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {/* Barra de progreso superior — mobile + desktop */}
      <div className="border-b border-border px-6 py-4 md:px-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              Definición del proyecto
            </span>
            {phase !== 'intro' && (
              <span className="text-xs text-muted">
                {phase === 'review'
                  ? 'Revisión'
                  : `Paso ${questionIndex + 1} de ${totalQuestions}`}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onSkip}
            disabled={isProcessing}
            className="text-xs font-medium text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:opacity-50 cursor-pointer"
          >
            Saltar preguntas
          </button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex min-h-[480px] flex-col lg:flex-row">
        <WizardSidebar
          questions={questions}
          answers={answers}
          phase={phase}
          questionIndex={questionIndex}
          onGoToQuestion={handleGoToQuestion}
        />

        {/* Contenido principal */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col p-6 md:p-8 lg:p-10">
            {/* ── Intro ── */}
            {phase === 'intro' && (
              <div key="intro" className={`flex flex-1 flex-col ${slideClass}`}>
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  Afinemos tu proyecto
                </h2>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
                  {discovery.summary}
                </p>

                {discovery.gaps.length > 0 && (
                  <div className="mt-8">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
                      Qué nos falta entender
                    </p>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {discovery.gaps.map((gap) => (
                        <li
                          key={gap}
                          className="flex items-start gap-2 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-body"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-8 rounded-xl border border-border bg-surface-muted/80 px-5 py-4">
                  <p className="text-sm text-muted">
                    Te haremos{' '}
                    <strong className="font-semibold text-foreground">
                      {totalQuestions} {totalQuestions === 1 ? 'pregunta' : 'preguntas'}
                    </strong>{' '}
                    puntuales. Elige la opción que mejor encaje o escribe la tuya.
                  </p>
                </div>
              </div>
            )}

            {/* ── Pregunta ── */}
            {phase === 'question' && currentQuestion && (
              <div key={`q-${currentQuestion.id}`} className={`flex flex-1 flex-col ${slideClass}`}>
                <span className="mb-3 inline-flex w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                  {CATEGORY_LABELS[currentQuestion.category]}
                </span>

                <h2 className="text-xl font-bold leading-snug text-foreground md:text-2xl">
                  {currentQuestion.question}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Selecciona la opción que mejor describa tu caso.
                </p>

                <div className="mt-8 flex flex-col gap-3">
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
                    OTHER_OPTION_ID && (
                    <div className="mt-1 animate-[fadeIn_0.2s_ease-out]">
                      <label className="mb-2 block text-xs font-medium text-muted">
                        Describe tu respuesta
                      </label>
                      <textarea
                        className="min-h-[100px] w-full resize-y rounded-xl border border-input-border bg-input p-4 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Escribe aquí tu respuesta personalizada..."
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
                  )}
                </div>
              </div>
            )}

            {/* ── Revisión ── */}
            {phase === 'review' && (
              <div key="review" className={`flex flex-1 flex-col ${slideClass}`}>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Revisa tus respuestas
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Confirma que todo esté correcto antes de generar los requerimientos.
                </p>

                <div className="mt-8 flex flex-col gap-3">
                  {questions.map((question, index) => {
                    const label = getAnswerLabel(question, answers);
                    return (
                      <div
                        key={question.id}
                        className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface-muted p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                            {CATEGORY_LABELS[question.category]}
                          </span>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {question.question}
                          </p>
                          <p className="mt-2 text-sm text-body">
                            {label ?? (
                              <span className="italic text-muted">Sin responder</span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGoToQuestion(index)}
                          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 cursor-pointer"
                        >
                          Editar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}
          </div>

          {/* Footer de navegación */}
          <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-muted/50 px-6 py-5 md:px-8 lg:px-10">
            <button
              type="button"
              onClick={goBack}
              disabled={isProcessing || phase === 'intro'}
              className={[
                'inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition-all cursor-pointer',
                phase === 'intro'
                  ? 'invisible'
                  : 'text-muted hover:bg-surface-hover hover:text-foreground',
                isProcessing && 'opacity-50 cursor-not-allowed',
              ].join(' ')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Anterior
            </button>

            {phase === 'intro' && (
              <button
                type="button"
                onClick={goForward}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-bold text-white shadow-[0_4px_20px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition-all hover:bg-primary-hover cursor-pointer"
              >
                Comenzar
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}

            {phase === 'question' && (
              <button
                type="button"
                onClick={goForward}
                disabled={!currentAnswerValid || isProcessing}
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold transition-all cursor-pointer',
                  currentAnswerValid && !isProcessing
                    ? 'bg-primary text-white shadow-[0_4px_20px_color-mix(in_srgb,var(--primary)_35%,transparent)] hover:bg-primary-hover'
                    : 'bg-disabled text-disabled-text cursor-not-allowed',
                ].join(' ')}
              >
                {questionIndex === totalQuestions - 1 ? 'Revisar respuestas' : 'Siguiente'}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}

            {phase === 'review' && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={answeredCount < totalQuestions || isProcessing}
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold transition-all cursor-pointer',
                  answeredCount >= totalQuestions && !isProcessing
                    ? 'bg-primary text-white shadow-[0_4px_20px_color-mix(in_srgb,var(--primary)_35%,transparent)] hover:bg-primary-hover'
                    : 'bg-disabled text-disabled-text cursor-not-allowed',
                ].join(' ')}
              >
                {isProcessing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Generando...
                  </>
                ) : (
                  <>
                    Generar deseos
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
