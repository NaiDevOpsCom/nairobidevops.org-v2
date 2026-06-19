/**
 * Safe Navigation Utility
 *
 * Provides centralized, secure navigation validation to prevent open redirects
 * and other URL-based attacks. All navigation in the app should use these utilities.
 *
 * Security features:
 * - Blocks dangerous protocols (javascript:, data:, vbscript:, file:)
 * - Blocks protocol-relative URLs (//evil.com)
 * - Handles URL-encoded bypass attempts
 * - Normalizes path traversal attempts
 * - Enforces relative-path-only internal navigation
 *
 * @module utils/safeNavigate
 */

/** Default fallback route when navigation target is invalid */
const DEFAULT_FALLBACK = "/";

/** Dangerous protocols that must be blocked */
const DANGEROUS_PROTOCOLS = ["javascript:", "data:", "vbscript:", "file:", "blob:"] as const;

/** Patterns that indicate protocol-relative or absolute URLs */
const ABSOLUTE_URL_PATTERNS = [
  /^\/\//, // Protocol-relative: //evil.com
  /^\\\/\\\//, // Escaped protocol-relative, e.g. source strings like "\\/\\/evil.com" that become "\/\/evil.com" at runtime
  /^\/\\/, // Mixed: /\evil.com
  /^[a-z][a-z0-9+.-]*:/i, // Any protocol: http:, https:, ftp:, etc.
] as const;

/**
 * Result of URL validation
 */
export interface ValidationResult {
  isValid: boolean;
  sanitizedUrl: string;
  reason?: string;
}

/**
 * Decodes a URL string, handling multiple layers of encoding.
 * Attackers may double/triple encode to bypass filters.
 *
 * @param url - The URL to decode
 * @returns Fully decoded URL string
 */
function fullyDecodeUrl(url: string): string {
  let decoded = url;
  let previous = "";

  // Keep decoding until no more changes (handles multiple encoding layers)
  // Limit iterations to prevent infinite loops on malformed input
  let iterations = 0;
  const maxIterations = 5;

  while (decoded !== previous && iterations < maxIterations) {
    previous = decoded;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // If decoding fails, return current state
      break;
    }
    iterations++;
  }

  return decoded;
}

/**
 * Normalizes a path by resolving .. and . segments.
 * Prevents path traversal attacks.
 * Handles query strings and hashes by separating them during normalization.
 *
 * @param path - The path to normalize
 * @returns Normalized path
 */
function normalizePath(path: string): string {
  // Separate path from query/hash
  const [pathPart, ...rest] = path.split("?");
  const queryAndHash = rest.length > 0 ? "?" + rest.join("?") : "";

  // Further split query from hash if needed, but for normalization
  // we primarily care about the path segment before '?'

  // Split path into segments
  const segments = pathPart.split("/").filter(Boolean);
  const normalized: string[] = [];

  for (const segment of segments) {
    if (segment === "..") {
      // Go up one level, but don't go above root
      normalized.pop();
    } else if (segment !== ".") {
      normalized.push(segment);
    }
  }

  // Reconstruct path with leading slash and reattach query/hash
  return "/" + normalized.join("/") + queryAndHash;
}

/**
 * Checks if a URL contains a dangerous protocol.
 *
 * @param url - The URL to check (should be decoded)
 * @returns True if dangerous protocol detected
 */
function hasDangerousProtocol(url: string): boolean {
  const lowerUrl = url.toLowerCase().trim();

  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (lowerUrl.startsWith(protocol)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a URL is absolute (external) or protocol-relative.
 *
 * @param url - The URL to check (should be decoded)
 * @returns True if URL is absolute or protocol-relative
 */
function isAbsoluteUrl(url: string): boolean {
  const trimmed = url.trim();

  for (const pattern of ABSOLUTE_URL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates and sanitizes a navigation target for internal use.
 *
 * @param target - The navigation target to validate
 * @param fallback - Fallback route if invalid (defaults to "/")
 * @returns Validation result with sanitized URL
 *
 * @example
 * ```typescript
 * const result = validateInternalRoute("/about");
 * // { isValid: true, sanitizedUrl: "/about" }
 *
 * const malicious = validateInternalRoute("javascript:alert(1)");
 * // { isValid: false, sanitizedUrl: "/", reason: "Dangerous protocol detected" }
 * ```
 */
export function validateInternalRoute(
  target: string,
  fallback: string = DEFAULT_FALLBACK
): ValidationResult {
  // Handle empty/null or whitespace-only input
  if (!target || typeof (target as unknown) !== "string" || !target.trim()) {
    return {
      isValid: false,
      sanitizedUrl: fallback,
      reason: "Empty or invalid input",
    };
  }

  // Decode to catch encoded bypass attempts
  const decoded = fullyDecodeUrl(target.trim());

  // Check for dangerous protocols
  if (hasDangerousProtocol(decoded)) {
    return {
      isValid: false,
      sanitizedUrl: fallback,
      reason: "Dangerous protocol detected",
    };
  }

  // Check for absolute/external URLs
  if (isAbsoluteUrl(decoded)) {
    return {
      isValid: false,
      sanitizedUrl: fallback,
      reason: "External URL not allowed for internal navigation",
    };
  }

  // Ensure path starts with /
  let sanitized = decoded.startsWith("/") ? decoded : "/" + decoded;

  // Normalize to prevent path traversal
  sanitized = normalizePath(sanitized);

  // Optional: Validate against allowed prefixes (strict mode)
  // Uncomment if you want strict route whitelisting
  // const isAllowedPrefix = ALLOWED_ROUTE_PREFIXES.some(
  //   prefix => pathOnly === prefix || pathOnly.startsWith(prefix + "/")
  // );
  // if (!isAllowedPrefix) {
  //   return {
  //     isValid: false,
  //     sanitizedUrl: fallback,
  //     reason: "Route not in allowed list",
  //   };
  // }

  return {
    isValid: true,
    sanitizedUrl: sanitized,
  };
}

/**
 * Gets a safe internal route, returning fallback if invalid.
 * This is the primary function to use for internal navigation.
 *
 * @param target - The navigation target
 * @param fallback - Fallback route if invalid (defaults to "/")
 * @returns Safe route string
 *
 * @example
 * ```typescript
 * // In a React component:
 * const navigate = useNavigate();
 * navigate(getSafeRoute(userInput));
 * ```
 */
export function getSafeRoute(target: string, fallback: string = DEFAULT_FALLBACK): string {
  return validateInternalRoute(target, fallback).sanitizedUrl;
}

/**
 * Validates an external URL for safe opening in a new tab.
 * Only allows http:// and https:// protocols.
 *
 * @param url - The URL to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateExternalUrl("https://example.com");
 * if (result.isValid) {
 *   window.open(result.sanitizedUrl, "_blank", "noopener,noreferrer");
 * }
 * ```
 */
export function validateExternalUrl(url: string): ValidationResult {
  if (!url || typeof (url as unknown) !== "string") {
    return {
      isValid: false,
      sanitizedUrl: "",
      reason: "Empty or invalid input",
    };
  }

  const decoded = fullyDecodeUrl(url.trim());

  // Check for dangerous protocols first
  if (hasDangerousProtocol(decoded)) {
    return {
      isValid: false,
      sanitizedUrl: "",
      reason: "Dangerous protocol detected",
    };
  }

  // Only allow http and https for external URLs
  const lowerDecoded = decoded.toLowerCase();
  if (!lowerDecoded.startsWith("http://") && !lowerDecoded.startsWith("https://")) {
    return {
      isValid: false,
      sanitizedUrl: "",
      reason: "Only http:// and https:// protocols allowed",
    };
  }

  return {
    isValid: true,
    sanitizedUrl: decoded,
  };
}

/**
 * Safely opens an external URL in a new tab with security attributes.
 * Safe to call in SSR environments (no-op).
 *
 * @param url - The URL to open
 * @returns True if opened successfully, false if blocked or not in browser
 */
export function safeOpenExternal(url: string): boolean {
  // SSR guard
  if (typeof window === "undefined") {
    return false;
  }

  const result = validateExternalUrl(url);

  if (!result.isValid) {
    console.warn(`[safeNavigate] Blocked external URL: ${result.reason}`);
    return false;
  }

  const opened = window.open(result.sanitizedUrl, "_blank", "noopener,noreferrer");
  return opened !== null;
}

/**
 * Determines if a URL is external (http/https) vs internal.
 * Safely handles encoded inputs.
 *
 * @param url - The URL to check
 * @returns True if external URL
 */
export function isExternalUrl(url: string): boolean {
  if (!url || typeof (url as unknown) !== "string") {
    return false;
  }

  const decoded = fullyDecodeUrl(url.trim());
  const lower = decoded.toLowerCase();

  return lower.startsWith("http://") || lower.startsWith("https://");
}
