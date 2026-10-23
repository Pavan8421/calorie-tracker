import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorState } from "@/components/common/ErrorState";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error boundary caught", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Unexpected UI error"
          message="Reload the page to continue."
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
