import { useEffect, useState, useCallback, useRef, useMemo } from "react";

import { LumaEvent, fetchLumaEvents } from "@/lib/lumaCalendar";

/**
 * useLumaEvents
 * ----------------
 * Improved hook:
 * - Safe against unmounted component updates
 * - Provides refresh() method
 * - Normalizes errors
 * - Memoized returns for render stability
 */

export function useLumaEvents() {
  const [events, setEvents] = useState<LumaEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Track mount state to avoid updating state after unmount
  const isMounted = useRef(true);

  // Normalize fetch logic & allow manual refresh
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedEvents = await fetchLumaEvents();

      // Prevent setting state when component is unmounted
      if (isMounted.current) {
        setEvents(fetchedEvents);
      }
    } catch (err: unknown) {
      const normalizedError = err instanceof Error ? err : new Error("Failed to fetch Luma events");

      console.error("useLumaEvents error:", normalizedError);

      if (isMounted.current) {
        setError(normalizedError);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  // Run fetch on mount
  useEffect(() => {
    void loadEvents();

    return () => {
      // Cleanup flag to prevent React warnings
      isMounted.current = false;
    };
  }, [loadEvents]);

  // Memoize returned object to keep referential stability
  return useMemo(
    () => ({
      events,
      loading,
      error,
      refetch: loadEvents, // expose manual refresh
    }),
    [events, loading, error, loadEvents]
  );
}
