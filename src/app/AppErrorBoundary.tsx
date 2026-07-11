import { Component, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--app-bg)] px-6 text-center text-[var(--app-text)]"
          role="alert"
        >
          <p className="text-sm text-[var(--app-muted)]">
            Something went wrong while loading the application.
          </p>
          <button
            className="rounded-full border border-[var(--app-border)] px-4 py-2 text-sm text-[var(--app-gold)]"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
