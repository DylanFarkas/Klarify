interface AgentErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function AgentErrorBanner({ message, onDismiss }: AgentErrorBannerProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-5 py-4 animate-[scaleIn_0.25s_ease-out]"
      role="alert"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
        <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-medium text-danger">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
          aria-label="Cerrar mensaje de error"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
