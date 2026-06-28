import {
  Search,
  MapPin,
  DollarSign,
  Globe,
  ChevronDown,
  SlidersHorizontal,
  Briefcase,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import React, { useState, useCallback, useEffect } from "react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Seo from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { statisticsData } from "@/data/ndcData";
import {
  useJobs,
  type Job,
  type JobFilters,
  type RoleType,
  type LocationType,
} from "@/hooks/useJobs";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: RoleType[] = [
  "DevOps Engineer",
  "SRE",
  "Platform Engineering",
  "Cloud Architect",
  "Backend Engineer",
  "Frontend Engineer",
  "Security",
  "Sysadmin",
];

const LOCATION_OPTIONS: { label: string; value: LocationType }[] = [
  { label: "Africa Remote", value: "africa_remote" },
  { label: "Africa Onsite", value: "africa_onsite" },
  { label: "International Remote", value: "international_remote" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Closing soon", value: "closing_soon" },
  { label: "Salary: high–low", value: "salary_desc" },
] as const;

const DEFAULT_FILTERS: JobFilters = {
  q: "",
  role_type: [],
  location_type: [],
  africa_friendly: false,
  sort: "newest",
  page: 1,
  per_page: 20,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the number of active filters (excluding page/per_page/sort/q).
 * Used to show the active filter badge count on the mobile filter button.
 */
function countActiveFilters(filters: JobFilters): number {
  return (
    filters.role_type.length + filters.location_type.length + (filters.africa_friendly ? 1 : 0)
  );
}

/** Map of common currency codes to their symbols. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF ",
  INR: "₹",
  NGN: "₦",
  KES: "KSh ",
  ZAR: "R ",
  GHS: "GH₵ ",
};

/** Resolve a currency code to a display symbol; falls back to the code itself. */
function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

/**
 * Format a salary range for display.
 * Returns null when both min and max are null (not disclosed).
 */
function formatSalary(job: Job): string | null {
  if (job.salary_min === null && job.salary_max === null) return null;
  const currency = job.salary_currency ?? "USD";
  const period = job.salary_period === "annual" ? "yr" : "mo";
  const symbol = currencySymbol(currency);

  if (job.salary_min !== null && job.salary_max !== null) {
    return `${symbol}${job.salary_min.toLocaleString()} – ${symbol}${job.salary_max.toLocaleString()} / ${period}`;
  }
  if (job.salary_min !== null) {
    return `From ${symbol}${job.salary_min.toLocaleString()} / ${period}`;
  }
  return `Up to ${symbol}${job.salary_max!.toLocaleString()} / ${period}`;
}

/**
 * Derive a human-readable posted-at label from an ISO datetime string.
 */
function formatPostedAt(postedAt: string): string {
  const then = Date.parse(postedAt);
  if (Number.isNaN(then)) return postedAt;
  const hours = Math.floor((Date.now() - then) / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  return `${weeks} weeks ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Company logo with graceful fallback to a briefcase icon. */
function CompanyLogo({
  logoUrl,
  companyName,
}: {
  readonly logoUrl: string | null;
  readonly companyName: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={`${companyName} logo`}
        className="w-full h-full object-contain rounded-lg"
        onError={() => setHasError(true)}
      />
    );
  }

  return <Briefcase className="h-5 w-5 text-muted-foreground" />;
}

/** Expiry urgency indicator shown on each job card. */
function UrgencyIndicator({ job }: { readonly job: Job }) {
  if (job.closes_at === null) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        {formatPostedAt(job.posted_at)}
      </span>
    );
  }

  const days = job.days_remaining ?? 0;

  if (days === 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
        <span
          className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse"
          aria-hidden="true"
        />{" "}
        Closing today
      </span>
    );
  }

  if (days <= 7) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        🔴 Closes in {days}d — act fast
      </span>
    );
  }

  if (days <= 14) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-500">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />⚠ Closes in {days}d
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
      Closes in {days}d
    </span>
  );
}

/** A single job listing card. */
function JobCard({ job }: { readonly job: Job }) {
  const salary = formatSalary(job);
  const applyUrl = job.affiliate_apply_url ?? job.apply_url;
  const isSafeUrl = /^https?:\/\//.test(applyUrl);
  const isFeatured = job.is_featured;

  return (
    <article
      className={[
        "relative flex flex-col md:flex-row gap-4 p-5 justify-between items-start md:items-center",
        "rounded-xl border transition-all duration-150",
        isFeatured
          ? "bg-[#141f16] border-primary/20 shadow-sm"
          : "bg-card border-border hover:bg-accent/30 hover:border-primary/20",
      ].join(" ")}
    >
      {/* Featured badge */}
      {isFeatured && (
        <div className="absolute -top-2 left-4">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
            ⭐ Featured
          </span>
        </div>
      )}

      {/* Left: logo + details */}
      <div className="flex gap-4 items-start flex-1 w-full">
        <div className="w-12 h-12 rounded-lg bg-accent/30 border border-border flex items-center justify-center shrink-0">
          <CompanyLogo
            key={job.company_logo_url ?? job.id}
            logoUrl={job.company_logo_url}
            companyName={job.company}
          />
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          {/* Title + company */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="text-base font-semibold text-foreground leading-snug">{job.title}</h3>
            <span className="text-sm text-muted-foreground">{job.company}</span>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Location type */}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-500 font-medium">
              <MapPin className="h-3 w-3" />
              {job.location_detail ?? job.location_type.replaceAll("_", " ")}
            </span>

            {/* Africa-friendly */}
            {job.africa_friendly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold">
                <Globe className="h-3 w-3" />
                Africa-friendly ✓
              </span>
            )}

            {/* Source attribution */}
            {/* <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-muted/50">
              via {job.source}
            </span> */}

            {/* Tech tags */}
            {job.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono bg-muted/60 border border-border text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {job.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{job.tags.length - 3}</span>
            )}
          </div>

          {/* Salary */}
          <div className="pt-0.5">
            {salary ? (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                {salary}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Salary not disclosed</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: urgency + apply */}
      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border">
        <UrgencyIndicator job={job} />

        {isSafeUrl ? (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "inline-flex items-center justify-center font-semibold text-sm h-9 rounded-md px-5 transition-colors",
              isFeatured
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border border-primary text-primary hover:bg-primary hover:text-primary-foreground",
            ].join(" ")}
          >
            Apply →
          </a>
        ) : (
          <button
            disabled
            className="inline-flex items-center justify-center font-semibold text-sm h-9 rounded-md px-5 bg-muted text-muted-foreground cursor-not-allowed opacity-60"
          >
            Apply
          </button>
        )}
      </div>
    </article>
  );
}

/** Loading skeleton that matches the JobCard dimensions. */
function JobCardSkeleton() {
  return (
    <div className="flex gap-4 p-5 rounded-xl border border-border bg-card animate-pulse">
      <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-4 w-2/5 bg-muted rounded" />
        <div className="h-3 w-3/5 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-5 w-24 bg-muted rounded-full" />
          <div className="h-5 w-20 bg-muted rounded-full" />
          <div className="h-5 w-16 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Filter panel — rendered both in the sidebar and the mobile sheet. */
function FilterPanel({
  filters,
  onChange,
  onClear,
}: {
  readonly filters: JobFilters;
  readonly onChange: (patch: Partial<JobFilters>) => void;
  readonly onClear: () => void;
}) {
  const activeCount = countActiveFilters(filters);

  const toggleRole = (role: RoleType) => {
    const next = filters.role_type.includes(role)
      ? filters.role_type.filter((r) => r !== role)
      : [...filters.role_type, role];
    onChange({ role_type: next, page: 1 });
  };

  const toggleLocation = (loc: LocationType) => {
    const next = filters.location_type.includes(loc)
      ? filters.location_type.filter((l) => l !== loc)
      : [...filters.location_type, loc];
    onChange({ location_type: next, page: 1 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Filter roles</h2>
          {activeCount > 0 && <p className="text-xs text-muted-foreground">{activeCount} active</p>}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Role type */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Role type
        </span>
        <div className="space-y-2">
          {ROLE_OPTIONS.map((role) => {
            const id = `role-${role.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <label
                key={role}
                htmlFor={id}
                className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer"
              >
                <Checkbox
                  id={id}
                  checked={filters.role_type.includes(role)}
                  onCheckedChange={() => toggleRole(role)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                {role}
              </label>
            );
          })}
        </div>
      </div>

      {/* Location type */}
      <div className="space-y-2.5 pt-4 border-t border-border">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Location
        </span>
        <div className="space-y-2">
          {LOCATION_OPTIONS.map(({ label, value }) => {
            const id = `loc-${value}`;
            return (
              <label
                key={value}
                htmlFor={id}
                className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer"
              >
                <Checkbox
                  id={id}
                  checked={filters.location_type.includes(value)}
                  onCheckedChange={() => toggleLocation(value)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                {label}
              </label>
            );
          })}
        </div>
      </div>

      {/* Africa-friendly toggle */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary block">
            Africa-friendly only
          </span>
          <span className="text-xs text-muted-foreground">Hires from Africa</span>
        </div>
        <Switch
          checked={filters.africa_friendly}
          onCheckedChange={(v) => onChange({ africa_friendly: v, page: 1 })}
          aria-label="Show only Africa-friendly roles"
          className="data-[state=checked]:bg-primary"
        />
      </div>
    </div>
  );
}

/** Pagination controls. */
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  readonly page: number;
  readonly totalPages: number;
  readonly onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Show at most 5 page numbers centred on current page
  const range: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) range.push(i);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-6">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ← Prev
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onPage(1)}
            className="px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
          >
            1
          </button>
          {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}

      {range.map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          aria-current={p === page ? "page" : undefined}
          className={[
            "px-3 py-1.5 text-sm rounded-md border transition-colors",
            p === page
              ? "bg-primary text-primary-foreground border-primary font-semibold"
              : "border-border text-muted-foreground hover:bg-accent",
          ].join(" ")}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <button
            onClick={() => onPage(totalPages)}
            className="px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next →
      </button>
    </nav>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export default function Jobs() {
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const { jobs, total, page, totalPages, lastSync, isLoading, isError, setPage } = useJobs(filters);

  // Merge a partial filter patch and always reset to page 1 unless page is
  // the only thing changing (setPage handles that separately).
  const patchFilters = useCallback((patch: Partial<JobFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount = countActiveFilters(filters);

  // Stats for the hero bar
  const totalMembers = statisticsData.find((s) => s.id === "community-members")?.number ?? "4,000+";
  const totalEvents = statisticsData.find((s) => s.id === "events")?.number ?? "70+";

  const [allJobsForCounting, setAllJobsForCounting] = useState<Job[]>([]);
  const [allJobsFetched, setAllJobsFetched] = useState(false);

  useEffect(() => {
    if (allJobsFetched) return;

    const controller = new AbortController();
    const fetchAllJobs = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
        const url = `${apiBase}/?action=jobs&page=1&per_page=1000`;
        const response = await fetch(url, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          setAllJobsForCounting(data.jobs || []);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Failed to fetch job count:", err);
        }
      } finally {
        setAllJobsFetched(true);
      }
    };

    fetchAllJobs();
    return () => controller.abort();
  }, [allJobsFetched]);

  const closingSoonCount = allJobsForCounting.filter(
    (j) => j.days_remaining !== null && j.days_remaining <= 7
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="DevOps Jobs for African Engineers"
        description="Curated DevOps, SRE, Cloud, and Platform Engineering roles for African engineers. Africa-friendly roles clearly marked. Updated daily."
      />
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-accent/30 dark:bg-accent/10 border-b border-border py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Eyebrow */}
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
            {"// open roles · updated daily"}
          </p>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            DevOps Jobs for African Engineers
          </h1>

          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Curated DevOps, SRE, Cloud, and Platform Engineering roles. Africa-friendly roles
            clearly marked.
          </p>

          {/* Stats bar */}
          <div className="inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-ndc-darkblue text-white rounded-full px-6 py-2.5 text-xs font-mono shadow-md">
            <span className="font-semibold text-primary">
              {isLoading ? "—" : `${total} open roles`}
            </span>
            <span className="text-white/30 hidden md:inline">|</span>
            <span className="text-white/80">
              {closingSoonCount > 0
                ? `${closingSoonCount} closing this week`
                : "Updated " + lastSync}
            </span>
            <span className="text-white/50 hidden md:inline">|</span>
            <span className="text-white/70">Updated {lastSync}</span>
          </div>

          {/* Search bar */}
          <div className="w-full max-w-2xl mx-auto flex gap-2.5 pt-2">
            <div className="relative flex-1">
              <Search className="absolute inset-y-0 left-3 my-auto h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={filters.q}
                onChange={(e) => patchFilters({ q: e.target.value, page: 1 })}
                placeholder="Search roles, companies, or technologies…"
                aria-label="Search jobs"
                className="w-full pl-10 pr-10 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background text-sm transition-all"
              />
              {filters.q && (
                <button
                  onClick={() => patchFilters({ q: "", page: 1 })}
                  className="absolute inset-y-0 right-3 my-auto text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-semibold rounded-lg">
              Search
            </Button>
          </div>

          {/* Quick filter pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {LOCATION_OPTIONS.map(({ label, value }) => {
              const active = filters.location_type.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => {
                    const next = active
                      ? filters.location_type.filter((l) => l !== value)
                      : [...filters.location_type, value];
                    patchFilters({ location_type: next, page: 1 });
                  }}
                  className={[
                    "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground bg-card hover:bg-accent",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
            <button
              onClick={() => patchFilters({ africa_friendly: !filters.africa_friendly, page: 1 })}
              className={[
                "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all",
                filters.africa_friendly
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "border-border text-muted-foreground bg-card hover:bg-accent",
              ].join(" ")}
            >
              ✓ Africa-friendly
            </button>
          </div>
        </div>
      </section>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Mobile filter + sort bar */}
        <div className="flex md:hidden items-center justify-between mb-6 gap-3">
          <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 bg-card border-border">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] overflow-y-auto bg-card border-border">
              <SheetHeader className="sr-only">
                <SheetTitle>Filter roles</SheetTitle>
                <SheetDescription>
                  Filter by role type, location, and Africa-friendly criteria
                </SheetDescription>
              </SheetHeader>
              <div className="py-6">
                <FilterPanel filters={filters} onChange={patchFilters} onClear={clearFilters} />
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort (mobile) */}
          <div className="relative flex items-center gap-2">
            <label htmlFor="sort-mobile" className="text-xs text-muted-foreground sr-only">
              Sort
            </label>
            <select
              id="sort-mobile"
              value={filters.sort}
              onChange={(e) =>
                patchFilters({ sort: e.target.value as JobFilters["sort"], page: 1 })
              }
              className="bg-card text-foreground border border-border rounded-md pl-3 pr-8 py-1.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar (desktop) */}
          <aside className="hidden md:block w-full lg:w-[220px] shrink-0 lg:sticky lg:top-24 self-start bg-card border border-border rounded-xl p-5 shadow-sm">
            <FilterPanel filters={filters} onChange={patchFilters} onClear={clearFilters} />
          </aside>

          {/* Jobs list */}
          <section className="flex-1 space-y-4" aria-label="Job listings">
            {/* Top bar: count + sort */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  "Loading…"
                ) : (
                  <>
                    <span className="font-bold text-foreground text-base">{total}</span>{" "}
                    {total === 1 ? "role" : "roles"} found
                  </>
                )}
              </p>

              {/* Sort (desktop) */}
              <div className="hidden md:flex items-center gap-2">
                <label htmlFor="sort-desktop" className="text-xs text-muted-foreground">
                  Sort by
                </label>
                <div className="relative">
                  <select
                    id="sort-desktop"
                    value={filters.sort}
                    onChange={(e) =>
                      patchFilters({ sort: e.target.value as JobFilters["sort"], page: 1 })
                    }
                    className="bg-card text-foreground border border-border rounded-md pl-3 pr-8 py-1.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 inset-y-0 my-auto h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Loading skeletons */}
            {isLoading && (
              <div className="space-y-4">
                {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((id) => (
                  <JobCardSkeleton key={id} />
                ))}
              </div>
            )}

            {/* Error state */}
            {!isLoading && isError && (
              <div className="flex flex-col items-center gap-3 py-16 text-center bg-card border border-border rounded-xl">
                <AlertCircle className="h-10 w-10 text-destructive/60" />
                <p className="font-medium text-foreground">Job listings temporarily unavailable</p>
                <p className="text-sm text-muted-foreground">
                  Check your connection or try again in a moment.
                </p>
                <Button
                  variant="outline"
                  className="mt-1 gap-2"
                  onClick={() => {
                    patchFilters({ page: 1 });
                    // Force a fetch by updating filters without setting page
                    setFilters((prev) => ({ ...prev, page: 1 }));
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && jobs.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center bg-card border border-border rounded-xl">
                <Search className="h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No roles match your filters</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or check back tomorrow — we update listings daily.
                </p>
                <Button variant="outline" className="mt-1" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </div>
            )}

            {/* Job cards */}
            {!isLoading && !isError && jobs.length > 0 && (
              <>
                {/* Featured strip */}
                {jobs.some((j) => j.is_featured) && (
                  <p className="text-xs font-mono text-primary">⭐ Featured Opportunities</p>
                )}

                <div className="space-y-3">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPage={(p) => {
                    setPage(p);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </>
            )}
          </section>
        </div>
      </main>

      {/* ── Employer CTA ─────────────────────────────────────────────────── */}
      <section className="bg-ndc-darkblue text-[#F5F5F7] border-t border-white/10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            {/* Left: copy */}
            <div className="max-w-xl space-y-3 text-center lg:text-left">
              <p className="text-xs font-mono text-primary uppercase tracking-widest">
                {"// for employers"}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold">Hire DevOps talent across Africa</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Connect with our vetted community of SREs, Platform Engineers, and Cloud Architects.
                Post a role and reach engineers actively building Africa&apos;s infrastructure.
              </p>
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-2">
                <Button className="flex items-center text-lg px-8 py-4 hover:bg-white hover:text-primary transition-colors duration-200 overflow-hidden">
                  Post a Job →
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center text-lg px-8 py-4 bg-white/10 border-white/20 text-white hover:bg-white hover:text-black overflow-hidden"
                >
                  Learn about featuring
                </Button>
              </div>
            </div>

            {/* Right: trust stats */}
            <div className="grid grid-cols-3 gap-6 text-center shrink-0">
              <div>
                <div className="text-3xl font-extrabold text-white">{totalMembers}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-primary mt-1">
                  Members
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white">{totalEvents}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-primary mt-1">
                  Events
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white">20+</div>
                <div className="text-xs font-bold uppercase tracking-widest text-primary mt-1">
                  Partners
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Notification strip ───────────────────────────────────────────── */}
      {/* <div className="bg-card border-t border-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium text-foreground">
            🔔 Get new DevOps jobs delivered daily
          </p>
          <div className="flex gap-3">
            <a
              href="https://t.me/nairobidevops"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 rounded-full text-xs font-semibold border border-border text-foreground hover:bg-[#229ED9] hover:text-white hover:border-[#229ED9] transition-colors"
            >
              Join Telegram
            </a>
            <a
              href="https://nairobidevops.slack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 rounded-full text-xs font-semibold border border-border text-foreground hover:bg-[#4A154B] hover:text-white hover:border-[#4A154B] transition-colors"
            >
              Join Slack
            </a>
          </div>
        </div>
      </div> */}

      <Footer />
    </div>
  );
}
