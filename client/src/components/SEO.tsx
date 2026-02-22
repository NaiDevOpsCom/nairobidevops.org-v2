import { Helmet } from "react-helmet-async";
import { useEffect, useMemo } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: string;
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  twitterImage?: string;
  robots?: string;
  ogLocale?: string;
  ogLocaleAlternate?: string[];
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
  keywords?: string;
}

export const SITE_NAME = import.meta.env.VITE_SITE_NAME || "Nairobi DevOps Community";
export const DEFAULT_OG_IMAGE =
  import.meta.env.VITE_OG_IMAGE || "https://nairobidevops.org/og-default.jpg";
export const DEFAULT_OG_IMAGE_ALT = import.meta.env.VITE_OG_IMAGE_ALT || "Nairobi DevOps Community";

const SEO = ({
  title,
  description,
  canonical,
  ogUrl,
  ogTitle,
  ogDescription,
  ogImage,
  ogImageAlt,
  ogType = "website",
  twitterCard = "summary_large_image",
  twitterSite,
  twitterCreator,
  twitterImage,
  robots = "index, follow",
  ogLocale = "en_US",
  ogLocaleAlternate,
  structuredData,
}: SEOProps) => {
  /* -------------------------------------------------------------------------
   * DEV SAFETY CHECKS (only runs in development)
   * ------------------------------------------------------------------------- */
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Title length warning
      if (title && title.length > 60) {
        console.warn(
          `SEO title "${title}" exceeds 60 characters. ` + "Google may truncate in search results."
        );
      }

      // Twitter handle format check
      const checkHandle = (handle?: string, label: string = "handle") => {
        if (handle && !handle.startsWith("@")) {
          console.warn(
            `SEO ${label} "${handle}" must start with "@" ` + '(e.g. "@NairobiDevOps").'
          );
        }
      };
      checkHandle(twitterSite, "twitterSite");
      checkHandle(twitterCreator, "twitterCreator");

      // Keywords deprecation warning (if we ever re-add it — we removed it)
      // Kept as comment for audit trails
      // console.warn("The `keywords` meta tag has negligible SEO impact and is omitted.");
    }
  }, [title, twitterSite, twitterCreator]);

  /* -------------------------------------------------------------------------
   * Core fallbacks
   * ------------------------------------------------------------------------- */
  const fullTitle = title
    ? title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`
    : SITE_NAME;

  const resolvedOgImage = ogImage || DEFAULT_OG_IMAGE;
  const resolvedOgImageAlt = ogImageAlt || DEFAULT_OG_IMAGE_ALT; // [NEW 1]

  const resolvedOgDescription = ogDescription || description;
  const resolvedOgUrl = ogUrl || canonical;

  const resolvedTwitterImage = twitterImage || resolvedOgImage;

  // Safe JSON serializer for embedding inside <script type="application/ld+json">
  const safeStringify = (obj: unknown) =>
    JSON.stringify(obj)
      .replace(/<\//g, "<\\/")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");

  /* -------------------------------------------------------------------------
   * Safe structured data rendering
   * ------------------------------------------------------------------------- */
  const validSchemas = useMemo(() => {
    const schemas = structuredData
      ? Array.isArray(structuredData)
        ? structuredData
        : [structuredData]
      : [];

    return schemas.filter((schema) => {
      try {
        JSON.stringify(schema); // Test serialization
        return true;
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error("Invalid structuredData schema skipped:", e);
        }
        return false;
      }
    });
  }, [structuredData]);

  /* -------------------------------------------------------------------------
   * Render
   * ------------------------------------------------------------------------- */
  return (
    <Helmet>
      {/* ── Basic Meta ───────────────────────────────────────────────── */}
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta name="robots" content={robots} />
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
      {/* ── Open Graph ───────────────────────────────────────────────── */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:site_name" content={SITE_NAME} />
      {resolvedOgDescription && <meta property="og:description" content={resolvedOgDescription} />}
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:image:alt" content={resolvedOgImageAlt} /> {/* [NEW 1] */}
      {resolvedOgUrl && <meta property="og:url" content={resolvedOgUrl} />}
      <meta property="og:locale" content={ogLocale} /> {/* [NEW 2] */}
      {/* Alternate locales */}
      {ogLocaleAlternate?.map((loc) => (
        <meta key={loc} property="og:locale:alternate" content={loc} />
      ))}
      {/* ── Twitter Card ─────────────────────────────────────────────── */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={ogTitle || fullTitle} />
      {resolvedOgDescription && <meta name="twitter:description" content={resolvedOgDescription} />}
      <meta name="twitter:image" content={resolvedTwitterImage} />
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
      {/* ── Structured Data ──────────────────────���──────────────────── */}
      {validSchemas.map((schema, index) => {
        const key =
          ((schema as Record<string, unknown>)["@id"] as string) ||
          ((schema as Record<string, unknown>)["@type"] as string) ||
          String(index);
        return (
          <script
            key={key}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeStringify(schema) }}
          />
        );
      })}
    </Helmet>
  );
};

export default SEO;
