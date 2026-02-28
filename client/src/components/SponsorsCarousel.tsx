import { motion } from "motion/react";
import { useMemo } from "react";

import { partnersData, type Partner } from "@/data/partnersData";
import { useCloudinaryFolder } from "@/hooks/useCloudinaryFolder";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SponsorCardProps {
  partner: Partner;
}

interface CarouselRowProps {
  partners: readonly Partner[];
  direction?: "left" | "right";
  duration?: number;
}

// ── SponsorCard ────────────────────────────────────────────────────────────────
function SponsorCard({ partner }: SponsorCardProps) {
  return (
    <div className="flex flex-col items-center justify-center px-8 md:px-12 min-w-[200px] md:min-w-[240px]">
      <div className="relative w-32 h-20 md:w-40 md:h-24 mb-3 opacity-60 hover:opacity-100 transition-all duration-300">
        <img
          src={partner.logo}
          alt={partner.name}
          className="w-full h-full object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>
      {/* <p className="text-sm font-medium text-foreground/80 text-center">{partner.name}</p> */}
    </div>
  );
}

// ── CarouselRow ────────────────────────────────────────────────────────────────
function CarouselRow({ partners, direction = "left", duration = 40 }: CarouselRowProps) {
  const duplicatedPartners = [...partners, ...partners];

  return (
    <div className="relative w-full overflow-hidden">
      <motion.div
        className="flex"
        animate={{
          x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"],
        }}
        transition={{
          duration,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      >
        {duplicatedPartners.map((partner, index) => (
          <SponsorCard key={`${partner.id}-${index}`} partner={partner} />
        ))}
      </motion.div>
    </div>
  );
}

// ── CarouselRowSkeleton ────────────────────────────────────────────────────────
// Shown only during the initial Cloudinary fetch.
// Matches the visual footprint of a real CarouselRow.

function CarouselRowSkeleton() {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center px-8 md:px-12 min-w-[200px] md:min-w-[240px]"
          >
            <div className="w-32 h-20 md:w-40 md:h-24 mb-3 rounded-md bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SponsorsCarousel ───────────────────────────────────────────────────────────

export function SponsorsCarousel() {
  // Fetch sponsor logos from the ndcPartners folder in Cloudinary.
  const { images, loading, error } = useCloudinaryFolder("ndcPartners");

  // Resolve the active partner list:
  //   1. Use Cloudinary data if fetch succeeded and returned results.
  //   2. Fall back to hardcoded communityPartners silently on error or empty response.
  //
  // Cloudinary images are mapped to the Partner shape so CarouselRow
  // and SponsorCard work without any changes.
  const activePartners: Partner[] = useMemo(() => {
    const hasCloudinaryData = !error && images.length > 0;

    if (hasCloudinaryData) {
      return images.map((image, index) => ({
        // Stable synthetic id based on publicId — avoids key collisions
        id: image.publicId,
        // Use the last segment of publicId as the name
        // e.g. "ndcPartners/safaricom-logo" → "safaricom-logo"
        name: image.publicId.split("/").pop() ?? `partner-${index}`,
        // secureUrl is the full Cloudinary CDN URL — used directly as img src
        logo: image.secureUrl,
      }));
    }

    // Silent fallback — no error UI shown, carousel still works with local data
    // If we're loading and have no data yet, return empty so we can show skeletons
    if (loading && images.length === 0) {
      return [];
    }

    return partnersData.communityPartners as Partner[];
  }, [images, loading, error]);

  // If loading and no data yet, show skeletons
  if (loading && activePartners.length === 0) {
    return (
      <div className="w-full space-y-8 md:space-y-12">
        <CarouselRowSkeleton />
        <CarouselRowSkeleton />
      </div>
    );
  }

  // Split into two rows for the staggered carousel layout.
  // Recalculates only when activePartners changes (Cloudinary load or fallback switch).
  const midPoint = Math.ceil(activePartners.length / 2);
  const row1 = activePartners.slice(0, midPoint);
  const row2 = activePartners.slice(midPoint);

  return (
    <div className="w-full space-y-8 md:space-y-12">
      {/* Row 1: scrolls right → left */}
      <CarouselRow partners={row1} direction="right" duration={50} />
      {/* Row 2: scrolls left → right */}
      {row2.length > 0 && <CarouselRow partners={row2} direction="left" duration={50} />}
    </div>
  );
}
