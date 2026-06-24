/**
 * Global Error Boundary Component
 *
 * SECURITY PURPOSE:
 * - Prevents internal error details (stack traces, file paths, component names)
 *   from leaking to end users in production environments.
 * - Provides a graceful fallback UI instead of a white screen crash.
 * - Logs detailed error information only in development for debugging.
 *
 * SCANNER COMPLIANCE:
 * - DeepSource: Proper try-catch patterns, no console.log in production paths
 * - Dependabot: No external dependencies introduced
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

import React, { Component, type ReactNode, type ErrorInfo } from "react";

/**
 * Props for the ErrorBoundary component.
 */
interface ErrorBoundaryProps {
  /** Child components to be wrapped by the error boundary */
  children: ReactNode;
  /** Optional custom fallback UI to display when an error occurs */
  fallback?: ReactNode;
  /** Array of values that, if changed, trigger a reset of the error boundary */
  resetKeys?: Array<unknown>;
}

/**
 * State for the ErrorBoundary component.
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error object (only populated in development) */
  error: Error | null;
  /** Component stack trace (only populated in development) */
  errorInfo: ErrorInfo | null;
}

/**
 * Determines if the current environment is development mode.
 * Uses Vite's built-in environment variable.
 *
 * @returns true if running in development mode
 */
const isDevelopment = (): boolean => {
  const mode =
    typeof import.meta !== "undefined" &&
    typeof import.meta.env !== "undefined" &&
    typeof import.meta.env.MODE === "string"
      ? import.meta.env.MODE
      : typeof process !== "undefined" && typeof process.env !== "undefined"
        ? process.env.NODE_ENV
        : undefined;

  return mode === "development";
};

/**
 * Global Error Boundary for the application.
 *
 * This class component catches JavaScript errors anywhere in its child
 * component tree and displays a fallback UI instead of crashing the app.
 *
 * BEHAVIOR BY ENVIRONMENT:
 * - Development: Shows full error details, stack trace, and component stack
 * - Production: Shows user-friendly message only, no technical details
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Component lifecycle method called when props or state update.
   * Used to automatically reset the error boundary when resetKeys change.
   *
   * @param prevProps - Previous props
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const prevKeys = prevProps.resetKeys ?? [];
    const nextKeys = this.props.resetKeys ?? [];

    // Check if error exists and resetKeys have changed
    if (this.state.hasError && prevKeys.length === nextKeys.length) {
      for (let i = 0; i < nextKeys.length; i += 1) {
        if (!Object.is(prevKeys[i], nextKeys[i])) {
          this.handleRetry();
          break;
        }
      }
    }
  }

  /**
   * React lifecycle method called when an error is thrown in a descendant component.
   * Updates state to trigger fallback UI rendering.
   *
   * @param error - The error that was thrown
   * @returns Updated state with error flag set
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render shows the fallback UI
    return {
      hasError: true,
      error: isDevelopment() ? error : null,
    };
  }

  /**
   * React lifecycle method called after an error has been thrown.
   * Used for error logging and capturing error info.
   *
   * SECURITY: In production, we intentionally do NOT log to console
   * to prevent accidental exposure of internal details.
   *
   * @param error - The error that was thrown
   * @param errorInfo - Object containing component stack information
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Store error info for development display
    if (isDevelopment()) {
      this.setState({ errorInfo });

      // Development: Log full error details to console for debugging

      console.group("🚨 Error Boundary Caught an Error");

      console.error("Error:", error);

      console.error("Component Stack:", errorInfo.componentStack);

      console.groupEnd();
    }

    // PRODUCTION: Errors are NOT logged to console to prevent information leakage.
    // In a production system, you would typically send errors to an
    // error monitoring service (e.g., Sentry, Datadog) here, ensuring
    // sensitive data is properly sanitized before transmission.
    //
    // Example (not implemented to avoid adding dependencies):
    // if (!isDevelopment()) {
    //   errorReportingService.captureException(error, { context: errorInfo });
    // }
  }

  /**
   * Resets the error boundary state, allowing the user to retry.
   */
  handleRetry = (): void => {
    window.location.reload();
  };

  /**
   * Renders the fallback UI or children based on error state.
   */
  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        try {
          return this.props.fallback;
        } catch (e) {
          if (isDevelopment()) {
            console.error("Error in custom fallback:", e);
          }
          // proceed to default fallback UI
        }
      }

      const { error, errorInfo } = this.state;
      const isDev = isDevelopment();

      return (
        <div style={styles.container} role="alert" aria-live="assertive">
          <div style={styles.content}>
            <div style={styles.iconWrapper}>
              <svg
                style={styles.icon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 style={styles.title}>Something went wrong</h1>

            {/* PRODUCTION: User-friendly message only */}
            {!isDev && (
              <p style={styles.message}>
                We apologize for the inconvenience. Please try refreshing the page or come back
                later.
              </p>
            )}

            {/* DEVELOPMENT: Full error details for debugging */}
            {isDev && error && (
              <div style={styles.devSection}>
                <p style={styles.devLabel}>🔧 Development Mode - Error Details:</p>

                <div style={styles.errorBox}>
                  <p style={styles.errorName}>{error.name}</p>
                  <p style={styles.errorMessage}>{error.message}</p>
                </div>

                {error.stack && (
                  <details style={styles.details}>
                    <summary style={styles.summary}>Stack Trace</summary>
                    <pre style={styles.stackTrace}>{error.stack}</pre>
                  </details>
                )}

                {errorInfo?.componentStack && (
                  <details style={styles.details}>
                    <summary style={styles.summary}>Component Stack</summary>
                    <pre style={styles.stackTrace}>{errorInfo.componentStack}</pre>
                  </details>
                )}
              </div>
            )}

            <div style={styles.buttonGroup}>
              <button type="button" onClick={this.handleRetry} style={styles.primaryButton}>
                Try Again
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.replace("/");
                }}
                style={styles.secondaryButton}
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline styles for the error boundary fallback UI.
 * Using inline styles to ensure the fallback works even if CSS fails to load.
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    padding: "1rem",
  },
  content: {
    maxWidth: "32rem",
    width: "100%",
    textAlign: "center",
    color: "#e2e8f0",
  },
  iconWrapper: {
    marginBottom: "1.5rem",
  },
  icon: {
    width: "4rem",
    height: "4rem",
    color: "#f59e0b",
    margin: "0 auto",
  },
  title: {
    fontSize: "1.875rem",
    fontWeight: 700,
    marginBottom: "1rem",
    color: "#f8fafc",
  },
  message: {
    fontSize: "1rem",
    color: "#94a3b8",
    marginBottom: "2rem",
    lineHeight: 1.6,
  },
  devSection: {
    textAlign: "left",
    marginBottom: "2rem",
  },
  devLabel: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#fbbf24",
    marginBottom: "0.75rem",
  },
  errorBox: {
    backgroundColor: "#1e293b",
    borderRadius: "0.5rem",
    padding: "1rem",
    marginBottom: "1rem",
    border: "1px solid #334155",
  },
  errorName: {
    color: "#ef4444",
    fontWeight: 600,
    marginBottom: "0.25rem",
    fontSize: "0.875rem",
  },
  errorMessage: {
    color: "#fca5a5",
    fontSize: "0.875rem",
    wordBreak: "break-word",
  },
  details: {
    marginBottom: "0.75rem",
  },
  summary: {
    cursor: "pointer",
    fontSize: "0.875rem",
    color: "#60a5fa",
    marginBottom: "0.5rem",
  },
  stackTrace: {
    backgroundColor: "#1e293b",
    padding: "1rem",
    borderRadius: "0.5rem",
    fontSize: "0.75rem",
    overflow: "auto",
    maxHeight: "12rem",
    color: "#94a3b8",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    border: "1px solid #334155",
  },
  buttonGroup: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    padding: "0.75rem 1.5rem",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    color: "#94a3b8",
    padding: "0.75rem 1.5rem",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: 500,
    border: "1px solid #334155",
    cursor: "pointer",
    transition: "all 0.2s",
  },
};

export default ErrorBoundary;
