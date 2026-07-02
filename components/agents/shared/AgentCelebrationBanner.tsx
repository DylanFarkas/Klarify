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
    <div className="relative overflow-hidden rounded-2xl border border-success/25 bg-linear-to-br from-success/[0.07] via-success/3 to-transparent px-6 py-6 animate-[scaleIn_0.35s_ease-out]">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-success/10 blur-3xl animate-[heroGlow_6s_ease-in-out_infinite]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-success/30 bg-success/15 animate-[celebrationPop_0.5s_ease-out]">
            <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-success">{title}</p>
            <p className="mt-0.5 text-sm text-success/70">{description}</p>
            {extra}
          </div>
        </div>

        {action && <div className="flex shrink-0 items-center sm:ml-auto">{action}</div>}
      </div>
    </div>
  );
}
