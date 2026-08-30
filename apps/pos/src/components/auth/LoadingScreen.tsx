export const LoadingScreen = ({ message }: { message: string }) => (
  <div className="flex h-full w-full items-center justify-center bg-surface">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
      <p className="text-sm font-medium text-ink-muted">{message}</p>
    </div>
  </div>
);
