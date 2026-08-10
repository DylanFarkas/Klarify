import type { ReactNode } from 'react';

interface AgentCelebrationBannerProps {
  title: string;
  description: string;
  action?: ReactNode;
  extra?: ReactNode;
}

export function AgentCelebrationBanner({
  title,
  description,
  action,
  extra,
}: AgentCelebrationBannerProps) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted">
            <svg
              className="h-4.5 w-4.5 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-tight text-foreground">{title}</p>
            <p className="mt-0.5 text-sm text-muted">{description}</p>
            {extra}
          </div>
        </div>

        {action ? <div className="flex shrink-0 items-center sm:ml-auto">{action}</div> : null}
      </div>
    </div>
  );
}
