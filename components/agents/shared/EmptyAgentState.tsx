import type { ReactNode } from 'react';

interface EmptyAgentStateProps {
  title: string;
  description: string;
  icon: ReactNode;
  action: ReactNode;
}

export function EmptyAgentState({ title, description, icon, action }: EmptyAgentStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-muted/50 py-20 text-center animate-[fadeIn_0.4s_ease-out]">
      <div
        className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/4 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-primary/3 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-md px-6">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/15 bg-linear-to-br from-primary/10 to-primary/5">
          {icon}
        </div>

        <h3 className="mb-2 text-xl font-bold text-foreground">{title}</h3>
        <p className="mb-8 text-sm leading-relaxed text-muted">{description}</p>

        {action}
      </div>
    </div>
  );
}
