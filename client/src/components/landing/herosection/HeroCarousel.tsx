import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { PanInfo } from "motion/react";

import HeroSlide from "./HeroSlide";

import { heroSlidesData } from "@/data/heroSlidesData";

const SLIDE_DURATION_MS = 6000; // 6s per slide (adjust to taste)
const SWIPE_CONFIDENCE = 800; // swipe sensitivity threshold

type Direction = 1 | -1;

const containerVariants = {
  enter: (direction: Direction) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: "0%", opacity: 1 },
  exit: (direction: Direction) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(1);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animatingRef = useRef(false); // prevents double-triggering during animation
  const slidesCount = heroSlidesData.length;

  // Preload all images to prevent flicker
  useEffect(() => {
    heroSlidesData.forEach((s) => {
      const img = new Image();
      img.src = s.bgImage;
    });
  }, []);

  const clampIndex = useCallback(
    (next: number) => {
      // ensure wrap-around
      return (next + slidesCount) % slidesCount;
    },
    [slidesCount]
  );

  const goTo = useCallback(
    (nextIndex: number, dir: Direction) => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      setDirection(dir);
      setIndex(clampIndex(nextIndex));
      // we release animatingRef after a short timeout that matches transition duration
      // adjust to match your motion transition duration (currently 0.9s)
      setTimeout(() => {
        animatingRef.current = false;
      }, 1000);
    },
    [clampIndex]
  );

  const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  // Autoplay with pause on hover/focus
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!isPaused) {
      timeoutRef.current = setTimeout(() => {
        next();
      }, SLIDE_DURATION_MS);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [index, isPaused, next]);

  // swipe power helper (from Framer Motion docs)
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  // Drag end handler
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const power = swipePower(info.offset.x, info.velocity.x);
    if (power > SWIPE_CONFIDENCE) {
      // user swiped right -> previous
      prev();
    } else if (power < -SWIPE_CONFIDENCE) {
      // user swiped left -> next
      next();
    }
  };

  // go to slide from thumbnails
  const goToSlide = (i: number) => {
    if (i === index) return;
    const dir: Direction = i > index ? 1 : -1;
    goTo(i, dir);
  };

  // keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      prev();
    } else if (e.key === "ArrowRight") {
      next();
    }
  };

  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
  return (
    <div
      id="home"
      tabIndex={0}
      role="region"
      className="relative min-h-screen flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/50"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      aria-roledescription="carousel"
      aria-label="Hero Carousel"
    >
      {/* Slide area */}
      <div className="absolute inset-0">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={index}
            custom={direction}
            variants={containerVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "tween", duration: 0.9, ease: "easeInOut" },
              opacity: { duration: 0.4 },
            }}
            className="absolute inset-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            <HeroSlide slide={heroSlidesData[index]} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots / progress */}
      <div className="absolute z-20 bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {heroSlidesData.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${i === index ? "bg-white" : "bg-white/40"}`}
          />
        ))}
      </div>

      {/* Thumbnails (optional) */}
      <div className="fixed right-6 bottom-6 z-30 flex items-center gap-3">
        {/* Counter */}
        <div className="text-xs md:text-sm tracking-wider text-white/90 ml-2">
          <span className="inline-block min-w-[1.2rem] text-right">
            {/* keep this simple; AnimatePresence could be used here for fancy number transitions */}
            {index + 1}
          </span>
          <span className="opacity-70"> / {slidesCount}</span>
        </div>
      </div>
    </div>
  );
}
