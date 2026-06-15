import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef } from "react";

import { teamGallery } from "@/data/galleryData";
import { seededRandom } from "@/lib/random";

const ANIMATION_VARIANTS = [
  {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.5, ease: "easeInOut" } as const,
  },
  {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 },
    transition: { duration: 0.6, ease: "easeOut" } as const,
  },
  {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
    transition: { duration: 0.7, ease: "easeIn" } as const,
  },
  {
    initial: { opacity: 0, scale: 1.2 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.5, ease: "circOut" } as const,
  },
  {
    initial: { opacity: 0, rotate: -10 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 10 },
    transition: { duration: 0.6, ease: "backInOut" } as const,
  },
  {
    initial: { opacity: 0, y: -40 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 40 },
    transition: { duration: 0.6, ease: "anticipate" } as const,
  },
];

const SLOT_COUNT = 6;

/**
 * Uses local teamGallery data with random slot updates.
 */
export default function TeamGallery() {
  // Initialize with the first N images (or wrap around if not enough)
  const [slotIndexes, setSlotIndexes] = useState<number[]>(() =>
    Array.from({ length: SLOT_COUNT }, (_, i) =>
      teamGallery.length > 0 ? i % teamGallery.length : 0
    )
  );

  const [slotTransitions, setSlotTransitions] = useState<number[]>(Array(SLOT_COUNT).fill(0));

  const timers = useRef<(ReturnType<typeof setInterval> | null)[]>(Array(SLOT_COUNT).fill(null));

  // Set up independent timers for each slot
  useEffect(() => {
    // Determine the pool of available indices
    const totalImages = teamGallery.length;
    if (totalImages === 0) return;

    // Clear any existing timers
    timers.current.forEach((timer) => timer && clearInterval(timer));

    // Capture the current timers array into a local const to ensure stable cleanup
    const mountedTimers = [...timers.current];

    // Set up new timers
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      const randomInterval = 3000 + Math.floor(seededRandom() * 4000); // 3-7s

      const id = setInterval(() => {
        setSlotIndexes((prev) => {
          const next = [...prev];
          // Pick a new random index for this slot, different from current
          let newIdx;
          do {
            newIdx = Math.floor(seededRandom() * totalImages);
            // Ensure we don't pick the same image if we have choices
          } while (newIdx === next[slot] && totalImages > 1);

          next[slot] = newIdx;
          return next;
        });

        setSlotTransitions((prev) => {
          const next = [...prev];
          next[slot] = Math.floor(seededRandom() * ANIMATION_VARIANTS.length);
          return next;
        });
      }, randomInterval);

      mountedTimers[slot] = id;
      timers.current[slot] = id;
    }

    return () => {
      mountedTimers.forEach((timer) => timer && clearInterval(timer));
    };
  }, []);

  if (teamGallery.length === 0) {
    return null; // Or some empty state
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {slotIndexes.map((imageIdx, slot) => {
        const item = teamGallery[imageIdx];
        const transitionIdx = slotTransitions[slot];
        const variant = ANIMATION_VARIANTS[transitionIdx];

        return (
          <AnimatePresence mode="wait" key={slot}>
            <motion.div
              key={`${item.url}-${slot}-${transitionIdx}`} // unique key to trigger animation on change
              initial={variant.initial}
              animate={variant.animate}
              exit={variant.exit}
              transition={variant.transition}
              className="group relative h-[220px] overflow-hidden rounded-xl shadow-lg sm:h-[260px] lg:h-[220px]"
            >
              <motion.img
                src={item.url}
                alt={item.alt}
                className="h-full w-full object-cover"
                style={{ minHeight: 180 }}
                loading="lazy"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
              <motion.div
                className="absolute bottom-0 left-0 right-0 flex h-16 items-end bg-gradient-to-t from-black/60 to-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="px-4 pb-2 text-base font-medium text-white drop-shadow-lg">
                  {item.alt}
                </span>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        );
      })}
    </div>
  );
}
