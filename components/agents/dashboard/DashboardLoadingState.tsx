'use client';

import type { CSSProperties } from 'react';
import {
  PageHeaderSkeleton,
  Skeleton,
  SkeletonBlock,
  StoryTableRowSkeleton,
} from '@/components/ui/Skeleton';

export type WorkspaceLoadingVariant = 'dashboard' | 'backlog' | 'stack' | 'board' | 'story-detail';

interface DashboardLoadingStateProps {
  variant?: WorkspaceLoadingVariant;
}

const PAGE_SHELL = 'flex w-full flex-col gap-5 px-6 pt-3 pb-5 md:gap-6';

export function DashboardLoadingState({ variant = 'dashboard' }: DashboardLoadingStateProps) {
  switch (variant) {
    case 'backlog':
      return <BacklogLoadingSkeleton />;
    case 'stack':
      return <StackLoadingSkeleton />;
    case 'board':
      return <BoardLoadingSkeleton />;
    case 'story-detail':
      return <StoryDetailLoadingSkeleton />;
    default:
      return <DashboardPageLoadingSkeleton />;
  }
}

function DashboardPageLoadingSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8 px-6 pt-3 pb-5" aria-busy="true" aria-label="Cargando dashboard">
      <SkeletonBlock delay={0} className="flex flex-col gap-5 border-b border-border/60 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-52" delay={20} />
            <Skeleton className="h-3 w-64 max-w-full" delay={40} />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" delay={30} />
          </div>
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" delay={60} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl bg-background/40 px-4 py-3.5">
              <Skeleton className="h-3 w-16" delay={index * 30} />
              <Skeleton className="mt-3 h-7 w-10" delay={index * 30 + 20} />
            </div>
          ))}
        </div>
      </SkeletonBlock>

      <SkeletonBlock delay={140} className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 4 }).map((_, index) => (
            <StoryTableRowSkeleton key={index} delay={index * 50} />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-2.5 w-full" delay={20} />
          <Skeleton className="h-2.5 w-4/5" delay={40} />
          <Skeleton className="h-2.5 w-3/5" delay={60} />
        </div>
      </SkeletonBlock>
    </div>
  );
}

function BacklogLoadingSkeleton() {
  return (
    <div className={PAGE_SHELL} aria-busy="true" aria-label="Cargando backlog">
      <SkeletonBlock
        delay={0}
        className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-border/60 pb-3"
      >
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Skeleton className="h-8 w-40 rounded-lg sm:w-56" />
          <Skeleton className="h-8 w-20 rounded-lg" delay={30} />
          <Skeleton className="h-8 w-24 rounded-lg" delay={60} />
        </div>
      </SkeletonBlock>

      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <SkeletonBlock key={sectionIndex} delay={80 + sectionIndex * 90} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
          <div className="overflow-hidden rounded-xl border border-border/60 bg-surface/40">
            <div className="hidden border-b border-border/40 px-3 py-2 sm:flex sm:gap-3">
              <Skeleton className="h-2 w-8" />
              <Skeleton className="h-2 min-w-0 flex-1" />
              <Skeleton className="h-2 w-16" />
              <Skeleton className="h-2 w-10" />
            </div>
            <div className="px-3 py-1">
              {Array.from({ length: sectionIndex === 0 ? 5 : 3 }).map((__, rowIndex) => (
                <StoryTableRowSkeleton key={rowIndex} delay={rowIndex * 40} />
              ))}
            </div>
          </div>
        </SkeletonBlock>
      ))}
    </div>
  );
}

function StackLoadingSkeleton() {
  return (
    <div className={PAGE_SHELL} aria-busy="true" aria-label="Cargando stack tecnológico">
      <PageHeaderSkeleton actionCount={2} />

      <SkeletonBlock delay={80} className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </SkeletonBlock>

      {Array.from({ length: 3 }).map((_, layerIndex) => (
        <SkeletonBlock key={layerIndex} delay={120 + layerIndex * 70} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: layerIndex === 0 ? 4 : layerIndex === 1 ? 3 : 2 }).map(
              (__, chipIndex) => (
                <Skeleton
                  key={chipIndex}
                  className="h-8 rounded-md"
                  style={{ width: `${72 + chipIndex * 18}px` } as CSSProperties}
                  delay={chipIndex * 35}
                />
              )
            )}
          </div>
        </SkeletonBlock>
      ))}
    </div>
  );
}

const BOARD_COLUMN_CARD_COUNTS = [3, 2, 1, 2] as const;

function KanbanCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-surface/40 p-3">
      <Skeleton className="h-2.5 w-14" delay={delay} />
      <Skeleton className="h-3.5 w-full" delay={delay + 20} />
      <Skeleton className="h-2.5 w-4/5" delay={delay + 40} />
      <div className="flex items-center justify-between pt-0.5">
        <Skeleton className="h-5 w-12 rounded-full" delay={delay + 60} />
        <Skeleton className="h-6 w-6 rounded-full" delay={delay + 80} />
      </div>
    </div>
  );
}

function BoardLoadingSkeleton() {
  return (
    <div
      className="flex w-full flex-col gap-4 px-6 pt-3 pb-5 md:gap-5"
      aria-busy="true"
      aria-label="Cargando tablero"
    >
      <SkeletonBlock
        delay={0}
        className="flex min-h-10 flex-col justify-center gap-2 border-b border-border/60 py-1.5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-56" delay={20} />
          <Skeleton className="h-3 w-48 max-w-full" delay={40} />
        </div>
        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-2.5 w-8" delay={20} />
          </div>
          <Skeleton className="h-1 w-full rounded-full" delay={40} />
        </div>
      </SkeletonBlock>

      <SkeletonBlock delay={60} className="rounded-xl border border-border/60 bg-surface/40 px-4 py-3.5 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-14 rounded-full" delay={20} />
            </div>
            <Skeleton className="h-3.5 w-full max-w-md" delay={40} />
            <Skeleton className="h-2.5 w-44" delay={60} />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="ml-auto h-3.5 w-24" delay={30} />
            <Skeleton className="ml-auto h-2.5 w-32" delay={50} />
          </div>
        </div>
      </SkeletonBlock>

      <SkeletonBlock
        delay={120}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          <Skeleton className="h-9 min-w-35 flex-1 rounded-lg sm:max-w-xs" />
          <Skeleton className="h-9 w-32 rounded-lg" delay={20} />
          <Skeleton className="hidden h-9 w-28 rounded-lg sm:block" delay={40} />
          <Skeleton className="hidden h-9 w-24 rounded-lg md:block" delay={60} />
          <Skeleton className="hidden h-9 w-32 rounded-lg lg:block" delay={80} />
        </div>
        <Skeleton className="h-9 w-28 shrink-0 rounded-md" delay={40} />
      </SkeletonBlock>

      <SkeletonBlock delay={180} className="flex gap-5 overflow-x-auto pb-4">
        {BOARD_COLUMN_CARD_COUNTS.map((cardCount, columnIndex) => (
          <div
            key={columnIndex}
            className="flex min-h-105 w-70 shrink-0 flex-col rounded-xl border border-border/50 bg-surface/80"
          >
            <header className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Skeleton className="h-1.5 w-1.5 shrink-0 rounded-full" delay={columnIndex * 30} />
                <Skeleton className="h-3.5 w-20" delay={columnIndex * 30 + 10} />
                <Skeleton className="h-2.5 w-4" delay={columnIndex * 30 + 20} />
              </div>
              <Skeleton className="h-2.5 w-8 shrink-0" delay={columnIndex * 30 + 30} />
            </header>
            <div className="flex min-h-80 flex-1 flex-col gap-2 px-2.5 pb-3">
              {Array.from({ length: cardCount }).map((_, cardIndex) => (
                <KanbanCardSkeleton
                  key={cardIndex}
                  delay={columnIndex * 50 + cardIndex * 35}
                />
              ))}
            </div>
          </div>
        ))}
      </SkeletonBlock>
    </div>
  );
}

function StoryDetailLoadingSkeleton() {
  return (
    <div className="flex min-h-full flex-col" aria-busy="true" aria-label="Cargando historia">
      <SkeletonBlock
        delay={0}
        className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/95 px-4 py-2 backdrop-blur-sm md:px-6"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="hidden h-3 w-16 sm:block" delay={20} />
          <Skeleton className="h-3.5 min-w-0 flex-1 max-w-xs" delay={40} />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="hidden h-3 w-10 sm:block" />
          <Skeleton className="h-7 w-7 rounded-md" delay={20} />
          <Skeleton className="h-7 w-7 rounded-md" delay={40} />
        </div>
      </SkeletonBlock>

      <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <SkeletonBlock delay={60} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-16 rounded font-mono" />
            <Skeleton className="h-5 w-14 rounded-full" delay={20} />
          </div>
          <Skeleton className="h-6 w-full max-w-2xl" delay={40} />
          <Skeleton className="h-3 w-full max-w-xl" delay={60} />
          <Skeleton className="h-3 w-4/5 max-w-lg" delay={80} />
        </SkeletonBlock>

        <SkeletonBlock delay={140} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-border/60 bg-surface/40 p-3">
              <Skeleton className="h-2.5 w-16" delay={index * 25} />
              <Skeleton className="h-8 w-full rounded-lg" delay={index * 25 + 20} />
            </div>
          ))}
        </SkeletonBlock>

        <SkeletonBlock delay={220} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </SkeletonBlock>
      </div>
    </div>
  );
}
