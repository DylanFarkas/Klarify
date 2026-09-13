import type { CSSProperties, ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  /** Retraso en ms para animación escalonada. */
  delay?: number;
  style?: CSSProperties;
}

export function Skeleton({ className = '', delay = 0, style }: SkeletonProps) {
  return (
    <div
      className={['skeleton-shimmer rounded-md', className].filter(Boolean).join(' ')}
      style={{ animationDelay: `${delay}ms`, ...style }}
      aria-hidden="true"
    />
  );
}

interface SkeletonBlockProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** Contenedor con entrada suave; útil para secciones de loading. */
export function SkeletonBlock({ children, className = '', delay = 0 }: SkeletonBlockProps) {
  return (
    <div
      className={['skeleton-enter', className].filter(Boolean).join(' ')}
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

interface PageHeaderSkeletonProps {
  actionCount?: number;
  delay?: number;
}

export function PageHeaderSkeleton({ actionCount = 1, delay = 0 }: PageHeaderSkeletonProps) {
  return (
    <SkeletonBlock
      delay={delay}
      className="flex min-h-10 flex-col justify-center gap-2 border-b border-border/60 py-1.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-3 w-full max-w-md" />
      </div>
      {actionCount > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          {actionCount > 1 ? <Skeleton className="h-8 w-24 rounded-md" delay={40} /> : null}
        </div>
      ) : null}
    </SkeletonBlock>
  );
}

export function SummaryStripSkeleton({ delay = 60 }: { delay?: number }) {
  return (
    <SkeletonBlock delay={delay} className="border-b border-border/60 pb-5">
      <div className="grid gap-5 sm:grid-cols-3 sm:gap-0">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={[
              'space-y-2 sm:px-5 first:sm:pl-0 last:sm:pr-0',
              index > 0 ? 'border-t border-border/40 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5' : '',
            ].join(' ')}
          >
            <Skeleton className="h-2.5 w-16" delay={index * 30} />
            <Skeleton className="h-3.5 w-4/5 max-w-50" delay={index * 30 + 20} />
            <Skeleton className="h-2.5 w-3/5 max-w-40" delay={index * 30 + 40} />
            {index === 0 ? (
              <Skeleton className="mt-1 h-1 w-full rounded-full" delay={index * 30 + 60} />
            ) : null}
          </div>
        ))}
      </div>
    </SkeletonBlock>
  );
}

export function StoryTableRowSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 py-2.5 last:border-b-0">
      <Skeleton className="h-3 w-14 shrink-0 font-mono" delay={delay} />
      <Skeleton className="h-3.5 min-w-0 flex-1" delay={delay + 20} />
      <Skeleton className="hidden h-3 w-20 shrink-0 sm:block" delay={delay + 40} />
      <Skeleton className="hidden h-6 w-10 shrink-0 rounded-md md:block" delay={delay + 60} />
      <Skeleton className="hidden h-6 w-16 shrink-0 rounded-md lg:block" delay={delay + 80} />
    </div>
  );
}
