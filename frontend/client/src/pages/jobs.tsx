import {
  Search,
  MapPin,
  DollarSign,
  Globe,
  ChevronDown,
  SlidersHorizontal,
  Briefcase,
} from "lucide-react";
import React, { useState, useMemo, useEffect } from "react";

// Job shape — previously imported from src/data/jobsData.ts (now deleted).
// Defined here so jobs.tsx is self-contained.
interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  description: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  period: string;
  tags: string[];
  isAfricaFriendly: boolean;
  isRemote: boolean;
  postedAt: string;
  closingIn?: string;
  applyUrl?: string;
  roleType:
    | "Platform Engineering"
    | "SRE"
    | "Cloud Architect"
    | "Security"
    | "DevOps Engineer"
    | "Sysadmin"
    | "Frontend Engineer"
    | "Backend Engineer";
  locationTag:
    | "Remote (Global)"
    | "Remote (Africa Only)"
    | "Nairobi, KE"
    | "Lagos, NG"
    | "Cape Town, ZA";
}

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

// NOTE: We fetch jobs from the backend endpoint and transform them into the
// frontend Job shape defined in src/data/jobsData.ts. The transformer is
// defensive and handles both the local demo shape and the backend (snake_case)
// fields (e.g. salary_min, posted_at, tags as JSON/string).

const matchesSearch = (job: Job, query: string): boolean => {
  if (!query) return true;
  return (
    job.title.toLowerCase().includes(query) ||
    job.company.toLowerCase().includes(query) ||
    job.description.toLowerCase().includes(query) ||
    job.tags.some((tag) => tag.toLowerCase().includes(query))
  );
};

const matchesQuickFilters = (job: Job, filters: string[]): boolean => {
  if (filters.length === 0) return true;
  return filters.every((filter) => {
    if (filter === "Remote") return job.isRemote;
    if (filter === "Kubernetes") return job.tags.includes("kubernetes");
    if (filter === "Senior") return job.title.toLowerCase().includes("senior");
    return true;
  });
};

const normalizeTags = (tags: unknown[]): string[] =>
  tags.map((tag) => String(tag).trim()).filter(Boolean);

const parseJobTags = (tags: unknown): string[] => {
  if (Array.isArray(tags)) {
    return normalizeTags(tags);
  }

  if (typeof tags === "string" && tags.length) {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return normalizeTags(parsed);
      }
      return [];
    } catch {
      return normalizeTags(tags.split(","));
    }
  }

  return [];
};

// Safely convert unknown values to string without accidentally producing
// "[object Object]". Prefer primitives; fall back to JSON.stringify for
// objects when reasonable.
const safeString = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // For objects/arrays, JSON.stringify is more explicit than String(obj),
  // and avoids the default "[object Object]" representation.
  try {
    const j = JSON.stringify(v);
    // Avoid returning empty objects as strings in cases where that isn't helpful
    return j === undefined || j === "{}" ? "" : j;
  } catch {
    return "";
  }
};

const str = (v: unknown): string => safeString(v);
const strOr = (...vals: unknown[]): string => {
  for (const v of vals) {
    const s = safeString(v);
    if (s !== "") return s;
  }
  return "";
};
const numOr = (...vals: unknown[]): number => {
  for (const v of vals) {
    const n = Number(v);
    if (v !== null && v !== undefined && !Number.isNaN(n)) return n;
  }
  return 0;
};

// parsePostedAt is defined at module level (not inside the component) so it is
// a stable reference and does not need to appear in useMemo dependency arrays.
const parsePostedAt = (posted: string, nowMs: number): number => {
  const num = Number.parseInt(posted, 10);
  if (Number.isNaN(num)) return 999;
  if (posted.includes("h ago")) return num;
  if (posted.includes("d ago")) return num * 24;
  // handle ISO datetimes by returning hours since posted (smaller = newer)
  if (/\d{4}-\d{2}-\d{2}T?/.test(posted)) {
    const then = Date.parse(posted);
    if (!Number.isNaN(then)) {
      return Math.floor((nowMs - then) / (1000 * 60 * 60));
    }
  }
  return num;
};

// Extract closing window from days_remaining or closingIn field.
const extractDaysRemaining = (jobObj: Record<string, unknown>): number | undefined => {
  const raw = jobObj.days_remaining ?? jobObj.daysRemaining;
  if (raw === undefined || raw === null) return undefined;
  const num = Number(raw);
  return Number.isNaN(num) ? undefined : num;
};

// Extract closing window text from closingIn field.
const extractClosingInText = (jobObj: Record<string, unknown>): string | undefined => {
  const raw = jobObj.closingIn ?? jobObj.closing_in;
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" && !Number.isNaN(raw)) return String(raw);
  const s = safeString(raw);
  return s === "" ? undefined : s;
};

const determineClosingIn = (jobObj: Record<string, unknown>): string | undefined => {
  const hasClosingDate = jobObj.closes_at ?? jobObj.closesAt;
  if (!hasClosingDate) return extractClosingInText(jobObj);

  const days = extractDaysRemaining(jobObj);
  if (days === undefined) return extractClosingInText(jobObj);
  if (days === 0) return "today";
  if (days > 0) return `${days}d`;
  return extractClosingInText(jobObj);
};

const determineRoleType = (raw: string, validRoles: string[]) =>
  validRoles.includes(raw) ? raw : "DevOps Engineer";

// Extract city from location detail string.
const extractCityFromDetail = (
  locDetail: string
): "Nairobi, KE" | "Lagos, NG" | "Cape Town, ZA" | null => {
  const lower = locDetail.toLowerCase();
  if (lower.includes("nairobi")) return "Nairobi, KE";
  if (lower.includes("lagos")) return "Lagos, NG";
  if (lower.includes("cape town") || lower.includes("cape-town")) return "Cape Town, ZA";
  return null;
};

const determineLocationTag = (
  locType: string,
  locDetail: string
): "Remote (Global)" | "Remote (Africa Only)" | "Nairobi, KE" | "Lagos, NG" | "Cape Town, ZA" => {
  if (locType === "africa_remote") return "Remote (Africa Only)";
  const city = extractCityFromDetail(locDetail);
  if (locType === "africa_onsite") return city ?? "Remote (Africa Only)";
  return city ?? "Remote (Global)";
};

// Defensively extract company logo URL from various backend shapes.
// Avoids String(object) => "[object Object]" bug.
const extractCompanyLogoUrl = (raw: unknown): string | undefined => {
  if (typeof raw === "string" && raw.trim() !== "") return raw;
  if (raw && typeof raw === "object") {
    // common shapes: { url: string } or { src: string }
    const asRec = raw as Record<string, unknown>;
    const maybe = asRec.url ?? asRec.src ?? asRec.path ?? asRec.logo;
    if (typeof maybe === "string" && maybe.trim() !== "") return maybe;
  }
  return undefined;
};

const mapBackendJobToFrontendJob = (j: Record<string, unknown>): Job => {
  // backend uses snake_case; transform defensively
  const tags = parseJobTags(j.tags);
  const salaryMin = numOr(j.salary_min, j.salaryMin);
  const salaryMax = numOr(j.salary_max, j.salaryMax);
  const currency = strOr(j.currency, "$");
  const period = strOr(j.period, "mo");
  const isAfricaFriendly = Boolean(j.is_africa_friendly ?? j.isAfricaFriendly ?? false);
  const isRemote = Boolean(j.is_remote ?? j.isRemote ?? false);
  const postedAt = strOr(j.posted_at, j.postedAt, j.postedAtAgo);
  const closingIn = determineClosingIn(j);
  const rawRoleType = strOr(j.role_type, j.roleType, j.role, "DevOps Engineer");
  const validRoles = [
    "Platform Engineering",
    "SRE",
    "Cloud Architect",
    "Security",
    "DevOps Engineer",
    "Sysadmin",
    "Frontend Engineer",
    "Backend Engineer",
  ] as const;
  type RoleType = (typeof validRoles)[number];
  const roleType = determineRoleType(rawRoleType, validRoles as unknown as string[]) as RoleType;
  const applyUrl = strOr(j.affiliate_apply_url, j.apply_url, j.applyUrl) || undefined;
  const rawLocType = strOr(j.location_type, j.locationType);
  const rawLocDetail = strOr(j.location_detail, j.location, j.location_label);
  const locationTag = determineLocationTag(rawLocType, rawLocDetail);
  const companyLogoRaw = j.company_logo_url ?? j.company_logo ?? j.companyLogo;
  const companyLogo = extractCompanyLogoUrl(companyLogoRaw);

  return {
    id: strOr(j.id, j.job_id),
    title: str(j.title),
    company: strOr(j.company, j.company_name),
    companyLogo,
    description: str(j.description),
    location: rawLocDetail,
    salaryMin,
    salaryMax,
    currency,
    period,
    tags: tags.map((t: unknown) => String(t).toLowerCase()),
    isAfricaFriendly,
    isRemote,
    postedAt,
    closingIn,
    applyUrl,
    roleType,
    locationTag,
  };
};

// CompanyLogo uses `key={logoUrl}` at the call-site to remount when the URL
// changes, which resets hasError to false without needing a setState-in-effect.
function CompanyLogo({
  logoUrl,
  companyName,
}: {
  readonly logoUrl?: string;
  readonly companyName: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={`${companyName} logo`}
        className="w-full h-full object-cover rounded-lg"
        onError={() => setHasError(true)}
      />
    );
  }

  return <Briefcase className="h-5 w-5 text-muted-foreground" />;
}

// Sidebar content extracted to a module-level component to reduce Jobs
// component complexity and avoid deep nesting.
function FilterSidebar({
  selectedRoles,
  selectedLocations,
  africaFriendly,
  roleOptions,
  locationOptions,
  onRoleToggle,
  onLocationToggle,
  onAfricaToggle,
  onClear,
}: Readonly<{
  selectedRoles: string[];
  selectedLocations: string[];
  africaFriendly: boolean;
  roleOptions: string[];
  locationOptions: string[];
  onRoleToggle: (r: string) => void;
  onLocationToggle: (l: string) => void;
  onAfricaToggle: (v: boolean) => void;
  onClear: () => void;
}>) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Filters</h2>
          <p className="text-xs text-muted-foreground">Browse by Category</p>
        </div>
        <button
          onClick={onClear}
          className="text-xs font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
        >
          Clear
        </button>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          ROLE TYPE
        </span>
        <div className="space-y-2">
          {roleOptions.map((role) => {
            const id = `role-${role.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <div key={role} className="flex items-center space-x-2.5">
                <label
                  htmlFor={id}
                  className="flex items-center space-x-2.5 text-sm text-foreground font-medium cursor-pointer"
                >
                  <Checkbox
                    id={id}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => onRoleToggle(role)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span>{role}</span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          LOCATION
        </span>
        <div className="space-y-2">
          {locationOptions.map((loc) => {
            const id = `location-${loc.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <div key={loc} className="flex items-center space-x-2.5">
                <label
                  htmlFor={id}
                  className="flex items-center space-x-2.5 text-sm text-foreground font-medium cursor-pointer"
                >
                  <Checkbox
                    id={id}
                    checked={selectedLocations.includes(loc)}
                    onCheckedChange={() => onLocationToggle(loc)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span>{loc}</span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-border flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary block">
            AFRICA-FRIENDLY
          </span>
          <span className="text-xs text-muted-foreground">Visas/Timezones</span>
        </div>
        <Switch
          checked={africaFriendly}
          onCheckedChange={onAfricaToggle}
          role="switch"
          aria-checked={africaFriendly}
          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
        />
      </div>
    </div>
  );
}

// Simple string hash for deterministic tag rotation
const simpleHash = (s: string): number => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = Math.trunc(hash * 31 + (s.codePointAt(i) ?? 0));
  }
  return Math.abs(hash);
};

// Render tags for a job (extracted to reduce cognitive complexity / nesting)
function JobTags({ job }: Readonly<{ job: Job }>) {
  const MAX_TAGS = 3;
  const allTags = job.tags;
  let displayed = allTags;
  if (allTags.length > MAX_TAGS) {
    const offset = simpleHash(job.id) % allTags.length;
    const rotated = [...allTags.slice(offset), ...allTags.slice(0, offset)];
    displayed = rotated.slice(0, MAX_TAGS);
  }
  const remaining = Math.max(0, allTags.length - displayed.length);
  return (
    <>
      {displayed.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-muted text-muted-foreground font-medium"
        >
          {tag}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-accent border border-border text-muted-foreground font-semibold">
          +{remaining} more
        </span>
      )}
    </>
  );
}

function JobCard({
  job,
  renderUrgencyIndicator,
}: Readonly<{
  job: Job;
  renderUrgencyIndicator: (job: Job) => React.ReactNode;
}>) {
  return (
    <article
      key={job.id}
      className="flex flex-col md:flex-row gap-4 p-5 justify-between items-start md:items-center bg-card border border-border rounded-xl transition-all duration-300 hover:shadow-md hover:border-primary/20"
    >
      <div className="flex gap-4 items-start flex-1 w-full">
        <div className="w-12 h-12 rounded-lg bg-accent/30 border border-border flex items-center justify-center shrink-0 text-foreground font-bold text-lg">
          <CompanyLogo
            key={job.companyLogo ?? job.id}
            logoUrl={job.companyLogo}
            companyName={job.company}
          />
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="text-lg font-bold text-foreground tracking-tight hover:text-primary transition-colors cursor-pointer">
              {job.title}
            </h3>
            <span className="text-sm text-muted-foreground font-medium">{job.company}</span>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {job.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-accent border border-border text-foreground font-medium">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {job.location}
            </span>

            {job.salaryMin === 0 && job.salaryMax === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-primary/10 border border-primary/20 text-primary font-bold">
                Not Disclosed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-primary/10 border border-primary/20 text-primary font-bold">
                <DollarSign className="h-3 w-3" />
                {job.currency}
                {job.salaryMin.toLocaleString()} – {job.currency}
                {job.salaryMax.toLocaleString()} / {job.period}
              </span>
            )}

            {job.isAfricaFriendly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                <Globe className="h-3 w-3" />
                Africa-Friendly
              </span>
            )}

            <JobTags job={job} />
          </div>
        </div>
      </div>

      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 w-full md:w-auto shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-border">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {renderUrgencyIndicator(job)}
        </div>

        {job.applyUrl ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/95 h-9 rounded-md px-4 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Apply
          </a>
        ) : (
          <button
            disabled
            className="inline-flex items-center justify-center font-bold text-sm bg-muted text-muted-foreground h-9 rounded-md px-4 shadow-sm cursor-not-allowed opacity-60"
          >
            Apply
          </button>
        )}
      </div>
    </article>
  );
}

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [africaFriendly, setAfricaFriendly] = useState(false);
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("Newest First");
  const [visibleCount, setVisibleCount] = useState(12);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Capture timestamp via lazy initializer (permitted to be impure at init time, not during render)
  const [nowMs] = useState<number>(() => Date.now());

  const renderUrgencyIndicator = (job: Job) => {
    if (job.closingIn === "today") {
      return (
        <>
          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-destructive">Closing today</span>
        </>
      );
    }
    if (job.closingIn) {
      return (
        <>
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-amber-500">Closes in {job.closingIn}</span>
        </>
      );
    }
    return (
      <>
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
        <span className="text-muted-foreground">{job.postedAt}</span>
      </>
    );
  };

  // Available Filter Options
  const roleOptions = [
    "Platform Engineering",
    "SRE",
    "Cloud Architect",
    "Security",
    "DevOps Engineer",
    "Sysadmin",
    "Frontend Engineer",
    "Backend Engineer",
  ];
  const locationOptions = [
    "Remote (Global)",
    "Remote (Africa Only)",
    "Nairobi, KE",
    "Lagos, NG",
    "Cape Town, ZA",
  ];

  // Toggle handlers
  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleLocationToggle = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const handleQuickFilterToggle = (filter: string) => {
    setQuickFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedRoles([]);
    setSelectedLocations([]);
    setAfricaFriendly(false);
    setQuickFilters([]);
  };

  // Filtering & Sorting Logic
  const filteredJobs = useMemo(() => {
    const query = search.toLowerCase().trim();
    return jobs
      .filter((job) => {
        if (!matchesSearch(job, query)) return false;
        if (selectedRoles.length > 0 && !selectedRoles.includes(job.roleType)) return false;
        if (selectedLocations.length > 0 && !selectedLocations.includes(job.locationTag))
          return false;
        if (africaFriendly && !job.isAfricaFriendly) return false;
        if (!matchesQuickFilters(job, quickFilters)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "Newest First") {
          return parsePostedAt(a.postedAt, nowMs) - parsePostedAt(b.postedAt, nowMs);
        } else if (sortBy === "Salary: High to Low") {
          return b.salaryMax - a.salaryMax;
        }
        return 0;
      });
  }, [jobs, search, selectedRoles, selectedLocations, africaFriendly, quickFilters, sortBy, nowMs]);

  const closingSoonCount = useMemo(() => {
    return jobs.filter((job) => {
      if (!job.closingIn) return false;
      if (job.closingIn === "today") return true;
      const days = Number.parseInt(job.closingIn, 10);
      return !Number.isNaN(days) && days <= 7;
    }).length;
  }, [jobs]);

  // Fetch jobs from backend and map to frontend Job type
  useEffect(() => {
    let cancelled = false;
    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/?action=jobs`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        // payload.jobs is expected to be an array of backend job objects
        const mapped: Job[] = (payload.jobs || []).map(mapBackendJobToFrontendJob);
        if (!cancelled) {
          setJobs(mapped);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sidebar is rendered via FilterSidebar component to keep this function
  // small and easier to follow.

  // Job list UI is rendered inline in JSX below using JobCard to keep this
  // component shallow and readable.

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Seo
        title="DevOps Jobs"
        description="Find DevOps, SRE, and Platform Engineering roles suited for African engineers with local and global remote options."
      />
      <Navbar />

      {/* A. Hero / Header Section */}
      <section className="bg-accent/40 dark:bg-accent/20 py-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Eyebrow Label */}
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
            {"// open roles · updated daily"}
          </p>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground font-sans">
            DevOps Jobs for African Engineers
          </h1>

          {/* Stats Bar */}
          <div className="inline-flex flex-wrap md:flex-nowrap items-center justify-center gap-x-4 gap-y-2 bg-ndc-darkblue text-white rounded-full px-6 py-2.5 text-xs md:text-sm font-medium shadow-md">
            <span>{loading ? "..." : `${jobs.length} open roles`}</span>
            <span className="hidden md:inline text-white/40">|</span>
            <span className="text-primary-light-blue font-semibold">
              {loading ? "..." : `${closingSoonCount} closing this week`}
            </span>
            <span className="hidden md:inline text-white/40">|</span>
            <span className="text-white/80">Updated 2 hours ago</span>
          </div>

          {/* Search Bar Row */}
          <div className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row gap-2.5 pt-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(12);
                }}
                placeholder="Search role, tech stack, or company..."
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all"
              />
            </div>
            <Button
              className="bg-primary text-white hover:bg-primary/95 px-6 py-3 h-auto font-bold rounded-lg shadow-sm"
              onClick={() => setVisibleCount(12)}
            >
              Find
            </Button>
          </div>

          {/* Quick Filter Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground mr-1">
              QUICK FILTERS:
            </span>
            {["Remote", "Kubernetes", "Senior"].map((filter) => {
              const isActive = quickFilters.includes(filter);
              return (
                <button
                  key={filter}
                  onClick={() => {
                    handleQuickFilterToggle(filter);
                    setVisibleCount(12);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border text-muted-foreground bg-card hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* B. Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Mobile Filter Toggle Button */}
        <div className="flex md:hidden items-center justify-between mb-6">
          <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 bg-card border-border">
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {(selectedRoles.length > 0 || selectedLocations.length > 0 || africaFriendly) && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {(selectedRoles.length > 0 ? 1 : 0) +
                      (selectedLocations.length > 0 ? 1 : 0) +
                      (africaFriendly ? 1 : 0)}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] overflow-y-auto bg-card border-border">
              <SheetHeader className="sr-only">
                <SheetTitle>Filter Roles</SheetTitle>
                <SheetDescription>
                  Filter job roles by type, location, and Africa-friendly criteria
                </SheetDescription>
              </SheetHeader>
              <div className="py-4">
                <FilterSidebar
                  selectedRoles={selectedRoles}
                  selectedLocations={selectedLocations}
                  africaFriendly={africaFriendly}
                  roleOptions={roleOptions}
                  locationOptions={locationOptions}
                  onRoleToggle={handleRoleToggle}
                  onLocationToggle={handleLocationToggle}
                  onAfricaToggle={setAfricaFriendly}
                  onClear={clearAllFilters}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort for Mobile */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase">SORT BY:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-card text-foreground border border-border rounded-md pl-3 pr-8 py-1.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Newest First">Newest First</option>
                <option value="Salary: High to Low">Salary: High to Low</option>
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Two-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar (Desktop & Tablet) */}
          <aside className="hidden md:block w-full lg:w-[220px] shrink-0 lg:sticky lg:top-24 self-start bg-card border border-border rounded-xl p-5 shadow-sm">
            <FilterSidebar
              selectedRoles={selectedRoles}
              selectedLocations={selectedLocations}
              africaFriendly={africaFriendly}
              roleOptions={roleOptions}
              locationOptions={locationOptions}
              onRoleToggle={handleRoleToggle}
              onLocationToggle={handleLocationToggle}
              onAfricaToggle={setAfricaFriendly}
              onClear={clearAllFilters}
            />
          </aside>

          {/* Right Content Area */}
          <section className="flex-1 space-y-6">
            {/* Top Bar (Filtered Count & Sort Selector) */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="text-sm uppercase tracking-wide">
                Showing{" "}
                <span className="font-bold text-primary text-base">{filteredJobs.length}</span>{" "}
                <span className="text-muted-foreground font-semibold">Roles</span>
                {loading && (
                  <span className="ml-2 text-xs text-muted-foreground">(loading...)</span>
                )}
                {error && <span className="ml-2 text-xs text-destructive">(failed to load)</span>}
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">SORT BY:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-card text-foreground border border-border rounded-md pl-3 pr-8 py-1.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    <option value="Newest First">Newest First</option>
                    <option value="Salary: High to Low">Salary: High to Low</option>
                  </select>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </span>
                </div>
              </div>
            </div>

            {/* Job Cards List */}
            {(() => {
              if (loading) {
                return (
                  <div className="text-center py-16 bg-card border border-border rounded-xl space-y-3">
                    <p className="text-lg font-medium text-foreground">Loading roles…</p>
                    <p className="text-sm text-muted-foreground">
                      Please wait while we fetch the latest jobs.
                    </p>
                  </div>
                );
              }

              if (error) {
                return (
                  <div className="text-center py-16 bg-card border border-border rounded-xl space-y-3">
                    <p className="text-lg font-medium text-foreground">Failed to load roles</p>
                    <p className="text-sm text-destructive">{error}</p>
                    <Button className="mt-2" onClick={() => location.reload()}>
                      Retry
                    </Button>
                  </div>
                );
              }

              if (filteredJobs.length === 0) {
                return (
                  <div className="text-center py-16 bg-card border border-border rounded-xl space-y-3">
                    <p className="text-lg font-medium text-foreground">
                      No roles match your filters
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Try clearing filters or search to browse all jobs.
                    </p>
                    <Button variant="outline" className="mt-2" onClick={clearAllFilters}>
                      Reset All Filters
                    </Button>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filteredJobs.slice(0, visibleCount).map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      renderUrgencyIndicator={renderUrgencyIndicator}
                    />
                  ))}
                </div>
              );
            })()}

            {/* Load More Button */}
            {filteredJobs.length > visibleCount && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => prev + 3)}
                  className="w-full sm:w-auto border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground font-mono font-bold tracking-wider"
                >
                  LOAD MORE ROLES
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* C. Footer CTA Section */}
      <section className="bg-ndc-darkblue text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Hire DevOps talent across Africa
            </h2>
            <p className="text-primary-light-blue text-sm md:text-base leading-relaxed">
              Connect with our vetted community of SREs, Platform Engineers, and Cloud Architects
              building the future of infrastructure.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto py-4">
            <div className="space-y-1">
              <div className="text-3xl md:text-4xl font-extrabold text-white">
                {statisticsData.find((s) => s.id === "community-members")?.number || "4,000+"}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary-light-blue">
                MEMBERS
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl md:text-4xl font-extrabold text-white">
                {statisticsData.find((s) => s.id === "events")?.number || "70+"}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary-light-blue">
                EVENTS HOSTED
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl md:text-4xl font-extrabold text-white">98%</div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary-light-blue">
                PLACEMENT RATE
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Button className="bg-primary text-white hover:bg-primary/95 text-base font-bold px-8 py-6 h-auto rounded-lg shadow-lg">
            Post a Job Now
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
