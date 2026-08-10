import type { ReactNode } from 'react';

interface EmptyAgentStateProps {
  title: string;
  description: string;
  icon: ReactNode;
  action: ReactNode;
}

export function EmptyAgentState({ title, description, icon, action }: EmptyAgentStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-5 py-14 text-center animate-[fadeIn_0.3s_ease-out]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-muted text-muted [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </div>

      <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>

      <div className="mt-6">{action}</div>
    </div>
  );
}
