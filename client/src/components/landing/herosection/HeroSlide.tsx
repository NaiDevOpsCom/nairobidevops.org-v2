import { Users, Calendar, ArrowRight, Briefcase, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { HeroSlideData } from "@/data/heroSlidesData";
import { isExternalUrl, safeOpenExternal, getSafeRoute } from "@/utils/safeNavigate";

interface HeroSlideProps {
  slide: HeroSlideData;
}

const bgVariant = {
  initial: { opacity: 0, scale: 1.04 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
};

const contentVariant = {
  initial: { opacity: 0, y: 20 },
  animate: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.06 * i } }),
  exit: { opacity: 0, y: -10 },
};

const iconMap = {
  users: Users,
  calendar: Calendar,
  "arrow-right": ArrowRight,
  briefcase: Briefcase,
  heart: Heart,
};

const HeroSlide: React.FC<HeroSlideProps> = ({ slide }) => {
  const [, navigate] = useLocation();
  // Track which image URL is loaded instead of a boolean.
  // When slide.bgImage changes, (loadedImage === slide.bgImage) naturally becomes false.
  const [loadedImage, setLoadedImage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const img = new Image();

    img.onload = () => {
      if (isMounted) setLoadedImage(slide.bgImage);
    };

    img.onerror = () => {
      if (isMounted) setLoadedImage(null);
    };

    img.src = slide.bgImage;

    return () => {
      isMounted = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [slide.bgImage]);

  const isLoaded = loadedImage === slide.bgImage;

  /**
   * Handle primary CTA click with safe navigation.
   * External URLs are validated and opened securely.
   * Internal routes are sanitized to prevent open redirects.
   */
  const handlePrimaryClick = () => {
    const link = slide.ctaPrimary.link;

    if (isExternalUrl(link)) {
      // Validate and open external URL with noopener/noreferrer
      safeOpenExternal(link);
    } else {
      // Sanitize internal route to prevent encoded URL attacks
      navigate(getSafeRoute(link));
    }
  };

  /**
   * Handle secondary CTA click with safe navigation.
   * Supports scroll-to-element, external URLs, and internal routes.
   */
  const handleSecondaryClick = () => {
    const link = slide.ctaSecondary.link;

    if (slide.ctaSecondary.isScroll) {
      // Scroll behavior - link is an element ID
      const el = document.getElementById(link);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (isExternalUrl(link)) {
      // Validate and open external URL with noopener/noreferrer
      safeOpenExternal(link);
    } else {
      // Sanitize internal route to prevent encoded URL attacks
      navigate(getSafeRoute(link));
    }
  };

  const PrimaryIcon = slide.ctaPrimary.icon ? iconMap[slide.ctaPrimary.icon] : null;
  const SecondaryIcon = slide.ctaSecondary.icon ? iconMap[slide.ctaSecondary.icon] : null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
      {/* Background image layer - Placeholder (blurred) */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center will-change-transform"
        style={{ backgroundImage: `url("${encodeURI(slide.placeholder)}")` }}
        variants={bgVariant}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.9, ease: "easeInOut" }}
        aria-hidden
      />

      {/* Background image layer - High Resolution */}
      <AnimatePresence mode="wait">
        {isLoaded && (
          <motion.div
            key={slide.bgImage}
            className="absolute inset-0 bg-cover bg-center will-change-transform"
            style={{ backgroundImage: `url("${encodeURI(slide.bgImage)}")` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* subtle dark overlay for contrast */}
      <motion.div
        className="absolute inset-0 bg-black/45 z-[1]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl h-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center text-center pointer-events-auto">
        <div>
          <motion.h2
            className="text-lg md:text-2xl lg:text-3xl font-semibold text-white mb-4 leading-tight"
            custom={0}
            variants={contentVariant}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.6 }}
          >
            {slide.headlineTop}
          </motion.h2>

          <motion.h1
            className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            custom={1}
            variants={contentVariant}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.8 }}
          >
            {slide.headlineMain}
          </motion.h1>

          <motion.p
            className="text-base md:text-lg text-gray-200 mb-8 leading-relaxed max-w-3xl mx-auto"
            custom={2}
            variants={contentVariant}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.7 }}
          >
            {slide.description}
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            custom={3}
            variants={contentVariant}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.7 }}
          >
            <Button
              size="lg"
              className="flex items-center text-lg px-8 py-4 hover:bg-[#023047] transition-colors duration-200"
              onClick={handlePrimaryClick}
            >
              {PrimaryIcon && <PrimaryIcon className="mr-2 h-5 w-5" />}
              {slide.ctaPrimary.text}
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="flex items-center text-lg px-8 py-4 bg-white/10 border-white/20 text-white hover:bg-white hover:text-black"
              onClick={handleSecondaryClick}
            >
              {SecondaryIcon && <SecondaryIcon className="mr-2 h-5 w-5" />}
              {slide.ctaSecondary.text}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HeroSlide;
