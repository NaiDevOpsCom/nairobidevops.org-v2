import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LocationType = "africa_remote" | "africa_onsite" | "international_remote";

export type SortOption = "newest" | "closing_soon" | "salary_desc";

export type JobSource = "remotive" | "weworkremotely";

export type RoleType =
  | "DevOps Engineer"
  | "SRE"
  | "Cloud Architect"
  | "Platform Engineering"
  | "Security"
  | "Backend Engineer"
  | "Frontend Engineer"
  | "Sysadmin";

export interface Job {
  id: number;
  title: string;
  company: string;
  company_logo_url: string | null;
  role_type: RoleType | string;
  location_type: LocationType;
  location_detail: string | null;
  africa_friendly: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_period: "monthly" | "annual" | null;
  experience_level: "junior" | "mid" | "senior" | "lead" | "any" | null;
  tags: string[];
  apply_url: string;
  affiliate_apply_url: string | null;
  source: JobSource;
  posted_at: string;
  closes_at: string | null;
  days_remaining: number | null;
  is_featured: boolean;
  description: string;
}

export interface JobFilters {
  /** Full-text search across title, company, and description */
  q: string;
  /** One or more role types e.g. ['DevOps Engineer', 'SRE'] */
  role_type: RoleType[];
  /** One or more location types */
  location_type: LocationType[];
  /** When true, only Africa-friendly roles are returned */
  africa_friendly: boolean;
  /** Sort order for results */
  sort: SortOption;
  /** Current page number (1-indexed) */
  page: number;
  /** Results per page (max 100) */
  per_page: number;
}

interface JobsApiResponse {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  last_updated: string | null;
  jobs: Job[];
}

interface UseJobsResult {
  /** Job listings for the current page */
  jobs: Job[];
  /** Total number of matching jobs (across all pages) */
  total: number;
  /** Current page number */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** ISO timestamp of the last sync run */
  lastUpdated: string | null;
  /** Human-readable "X hours ago" / "Just now" string derived at fetch time */
  lastSync: string;
  /** True while a fetch is in flight */
  isLoading: boolean;
  /** True if the API returned an error or is unreachable */
  isError: boolean;
  /** Navigate to a specific page */
  setPage: (page: number) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Milliseconds to wait after the last keystroke before firing a search request */
const SEARCH_DEBOUNCE_MS = 300;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the query string from the active filters.
 * Only appends params that have a non-empty value so the URL stays clean.
 */
function buildQueryString(filters: JobFilters): string {
  const params = new URLSearchParams();

  if (filters.q.trim()) {
    params.set("q", filters.q.trim());
  }

  if (filters.role_type.length > 0) {
    params.set("role_type", filters.role_type.join(","));
  }

  if (filters.location_type.length > 0) {
    params.set("location_type", filters.location_type.join(","));
  }

  if (filters.africa_friendly) {
    params.set("africa_friendly", "1");
  }

  if (filters.sort !== "newest") {
    // 'newest' is the API default — no need to send it
    params.set("sort", filters.sort);
  }

  params.set("page", String(filters.page));
  params.set("per_page", String(filters.per_page));

  return params.toString();
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches job listings from the PHP API with full filter, sort, and pagination support.
 *
 * Usage:
 * ```tsx
 * const { jobs, total, isLoading, isError, setPage } = useJobs(filters);
 * ```
 *
 * Behaviour:
 * - Search query (`q`) is debounced by 300 ms before fetching
 * - Any filter change other than `page` resets pagination back to page 1
 * - Stale responses are discarded — only the latest request updates state
 * - Returns `isError: true` if the API is unreachable or returns a non-OK status
 */
export function useJobs(filters: JobFilters): UseJobsResult {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>("—");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Internal page state — owned by the hook so setPage can trigger a re-fetch
  const [currentPage, setCurrentPage] = useState(filters.page);

  // Debounced search term — updated after SEARCH_DEBOUNCE_MS of silence
  const [debouncedQ, setDebouncedQ] = useState(filters.q);

  // Track the previous filters (excluding q and page) to detect filter changes
  const prevFiltersRef = useRef<Omit<JobFilters, "q" | "page"> | null>(null);

  // ── Debounce the search query ───────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(filters.q);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [filters.q]);

  // ── Reset to page 1 when non-page filters change ────────────────────────────

  useEffect(() => {
    const nonPageFilters: Omit<JobFilters, "q" | "page"> = {
      role_type: filters.role_type,
      location_type: filters.location_type,
      africa_friendly: filters.africa_friendly,
      sort: filters.sort,
      per_page: filters.per_page,
    };

    const prev = prevFiltersRef.current;

    if (prev !== null && JSON.stringify(prev) !== JSON.stringify(nonPageFilters)) {
      setCurrentPage(1);
    }

    prevFiltersRef.current = nonPageFilters;
  }, [
    filters.role_type,
    filters.location_type,
    filters.africa_friendly,
    filters.sort,
    filters.per_page,
  ]);

  // Reset to page 1 when the debounced search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQ]);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    // AbortController lets us cancel a stale in-flight request when a new
    // one starts — prevents race conditions and out-of-order state updates
    const controller = new AbortController();

    const fetchJobs = async () => {
      setIsLoading(true);
      setIsError(false);

      const activeFilters: JobFilters = {
        ...filters,
        q: debouncedQ,
        page: currentPage,
      };

      const queryString = buildQueryString(activeFilters);
      const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
      const url = `${apiBase}/?action=jobs&${queryString}`;

      try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data: JobsApiResponse = await response.json();

        setJobs(data.jobs);
        setTotal(data.total);
        setTotalPages(data.total_pages);
        setLastUpdated(data.last_updated);

        // Compute the human-readable age here (inside an effect) so that
        // the component never needs to call Date.now() during render.
        if (data.last_updated) {
          const fetchedAt = Date.now();
          const hours = Math.floor((fetchedAt - Date.parse(data.last_updated)) / (1000 * 60 * 60));
          setLastSync(hours < 1 ? "Just now" : `${hours}h ago`);
        } else {
          setLastSync("—");
        }
      } catch (err) {
        // Ignore AbortError — it's expected when a newer request cancels this one
        if (err instanceof Error && err.name === "AbortError") return;

        console.error("[useJobs] fetch failed:", err);
        setIsError(true);
        setJobs([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();

    // Cancel the in-flight request when the effect re-runs or the component unmounts
    return () => controller.abort();
  }, [
    debouncedQ,
    filters.role_type,
    filters.location_type,
    filters.africa_friendly,
    filters.sort,
    filters.per_page,
    currentPage,
  ]);

  // ── Public page setter ──────────────────────────────────────────────────────

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    jobs,
    total,
    page: currentPage,
    totalPages,
    lastUpdated,
    lastSync,
    isLoading,
    isError,
    setPage,
  };
}
