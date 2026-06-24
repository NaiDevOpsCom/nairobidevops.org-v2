import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

/**
 * Application entry point.
 *
 * SECURITY: The ErrorBoundary wraps the entire application to:
 * - Catch unhandled JavaScript errors in any component
 * - Display a user-friendly fallback instead of a blank screen
 * - Prevent internal error details from leaking to users in production
 *
 * @see client/src/components/ErrorBoundary.tsx
 */
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find the root element");
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </ErrorBoundary>
);
