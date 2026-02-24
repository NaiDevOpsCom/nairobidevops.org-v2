import { Image as UnpicImage } from "@unpic/react";
import {
  Cloud,
  Wrench,
  Award,
  Rocket,
  Handshake,
  Youtube,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";

import AfricaDevOpsSummitSection from "@/components/events/AfricaDevOpsSummitSection";
import EventsTypeSection from "@/components/events/EventsTypeSection";
import LumaEventsList from "@/components/events/LumaEventsList";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import RecordedVideoCard from "@/components/RecordedVideoCard";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { recordedSessions } from "@/data/communityPageData";
import { getFAQsByCategory } from "@/data/faqData";
import { GalleryImage, communityGallery } from "@/data/galleryData";
import { seededRandom } from "@/lib/random";
import { getRandomItems } from "@/utils/getRandomItems";

const REASONS = [
  { icon: Cloud, title: "Explore cloud and DevOps" },
  { icon: Wrench, title: "Spark practical learning and growth" },
  { icon: Award, title: "Recognize and certify practical skills" },
  { icon: Rocket, title: "Empower Kenya's future tech leaders" },
  { icon: Handshake, title: "Host workshops and campus tours" },
] as const;

// Structured Data — EventSeries JSON-LD
const eventsPageSchema: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "EventSeries",
  name: "Nairobi DevOps Community Events",
  description:
    "Workshops, meetups, campus tours and hands-on DevOps sessions hosted by Nairobi DevOps Community across Kenya.",
  url: "https://nairobidevops.org/events",
  organizer: {
    "@type": "Organization",
    name: "Nairobi DevOps Community",
    url: "https://nairobidevops.org",
  },
  location: {
    "@type": "Place",
    name: "Nairobi, Kenya",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Nairobi",
      addressCountry: "KE",
    },
  },
};

const generateEventsFaqSchema = (): Record<string, unknown> => {
  const faqs = getFAQsByCategory("Events & Programs");
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
};

const EVENTS_FAQ_SCHEMA = generateEventsFaqSchema();

// Main Page Component

export default function Eventspage() {
  // Random background image for "Why Our Events Matter"
  const [matterBgImage] = useState<GalleryImage | null>(() => {
    return getRandomItems(communityGallery, 1)[0] || null;
  });

  // Random CTA background image from galleryData (weighted by priority)
  const [ctaBgImage] = useState<GalleryImage>(() => {
    const pool = communityGallery.flatMap((img) => (img.priority ? [img, img] : [img]));
    return pool.length > 0
      ? pool[Math.floor(seededRandom() * pool.length)]
      : { url: "", alt: "Community image", priority: false };
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Events & Workshops"
        description="Join Nairobi DevOps Community events, workshops, campus tours and meetups. Discover upcoming and past DevOps events across Kenya."
        canonical="https://nairobidevops.org/events"
        ogImage="https://ik.imagekit.io/nairobidevops/ndc-assets/PXL_20240601_141554232.jpg?updatedAt=1755152981738"
        twitterSite="@NairobiDevOps"
        structuredData={[eventsPageSchema, EVENTS_FAQ_SCHEMA]}
      />

      <Navbar />

      {/* Hero */}
      <header
        role="banner"
        aria-label="Events and Workshops hero section"
        className="relative min-h-[50vh] flex items-center justify-center text-center"
        style={{
          backgroundImage:
            "url('https://ik.imagekit.io/nairobidevops/ndc-assets/PXL_20240601_141554232.jpg?updatedAt=1755152981738')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Events & Workshops
          </h1>
          <p className="text-md md:text-lg text-white/80 max-w-3xl mx-auto mb-8">
            Discover what&apos;s happening, when, and why it matters. From casual meetups to
            hands-on workshops, our events are where DevOps ideas come to life—your voice included.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-primary hover:bg-[#023047] text-white"
              aria-label="Scroll to Events and Meetups section"
              onClick={() => {
                const element = document.getElementById("meetup");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              Check our Events
            </Button>
          </div>
        </div>
      </header>

      {/* Why Our Events Matter */}
      <section
        className="py-16 lg:py-24 bg-blue-50 dark:bg-ndc-darkblue"
        aria-labelledby="why-events-matter-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <h2
                id="why-events-matter-heading"
                className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6"
              >
                Why Our Events Matter
              </h2>
              <ul className="space-y-6 max-w-xl">
                {REASONS.map(({ icon: Icon, title }, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <span className="shrink-0 mt-1">
                      <span className="inline-flex items-center justify-center h-10 w-10 rounded-md bg-white shadow text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="text-base md:text-lg text-gray-800 dark:text-gray-200">
                      {title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative order-1 lg:order-2">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <UnpicImage
                  src={
                    matterBgImage?.url ||
                    "https://ik.imagekit.io/nairobidevops/ndcAssets/IMG_9864.jpg?updatedAt=1764488001283"
                  }
                  alt={matterBgImage?.alt || "Nairobi DevOps Community event group photo"}
                  className="w-full h-80 md:h-96 object-cover"
                  width={1200}
                  height={800}
                  loading="lazy"
                  layout="constrained"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Type of Events */}
      <EventsTypeSection />

      {/* Meetups */}
      <section
        id="meetup"
        className="py-16 lg:py-24 dark:bg-ndc-darkblue"
        aria-labelledby="meetups-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="meetups-heading" className="text-2xl md:text-3xl font-bold mb-4">
              Events & Meetups
            </h2>
            <p className="text-3xl md:text-4xl font-bold">
              Workshops, Talks &amp; Real-World Collaboration
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-4">
              Join us for hands-on sessions, tech talks, and community meetups designed to sharpen
              your skills and grow your DevOps journey.
            </p>
          </div>

          {/* Upcoming Events from Luma */}
          <div className="mb-16">
            <h3 className="text-2xl md:text-3xl font-bold text-primary text-center mb-8">
              Upcoming Events
            </h3>
            <LumaEventsList />
          </div>
        </div>
      </section>

      {/* Africa DevOps Summit */}
      <AfricaDevOpsSummitSection />

      {/* Past Events Highlights */}
      <section
        className="py-16 lg:py-24 bg-primary-light-blue dark:bg-ndc-darkblue"
        aria-labelledby="past-events-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="past-events-heading" className="text-3xl md:text-4xl font-bold">
              Past Events Highlights
            </h2>
          </div>
          <p className="text-center text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
            Explore our curated selection of past sessions — recordings, recaps, and highlights to
            help you catch up, learn, and revisit talks from our community events.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recordedSessions.map((session) => (
              <RecordedVideoCard
                key={session.id}
                id={session.id}
                title={session.title}
                videoUrl={session.videoUrl}
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-white bg-primary hover:bg-ndc-darkblue hover:text-white px-8 py-6 text-lg transition-all duration-300 shadow-lg dark:bg-white dark:text-primary dark:hover:bg-primary dark:hover:text-white"
            >
              <a
                href="https://www.youtube.com/@NairobiDevopsCommunity"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Nairobi DevOps YouTube Channel Library (opens in new tab)"
                className="flex items-center gap-2"
              >
                <Youtube className="w-5 h-5" aria-hidden="true" />
                <span>Visit Channel Library</span>
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Events CTA */}
      <section
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        aria-labelledby="cta-heading"
      >
        {/* Background Image */}
        <div className="absolute inset-0" aria-hidden="true">
          {ctaBgImage.url && (
            <UnpicImage
              src={ctaBgImage.url}
              alt=""
              role="presentation"
              layout="fullWidth"
              className="w-full h-full object-cover"
              loading="lazy"
              priority={false}
            />
          )}
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70" aria-hidden="true" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <h2 id="cta-heading" className="text-4xl md:text-5xl font-bold text-primary mb-6">
            Join the Movement
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
            Whether you want to attend events, share your expertise as a speaker, host a campus
            session, or partner with us—there&apos;s a place for you in the Nairobi DevOps
            Community. Let&apos;s build the future of tech together.
          </p>

          <div className="flex flex-col lg:flex-row flex-wrap gap-4 items-center justify-center">
            {/* Primary CTA */}
            <div className="mb-6 lg:mb-0 lg:mr-6">
              <Link href="/partners">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-[#023047] text-white px-10 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Partner with Us
                </Button>
              </Link>
            </div>

            {/* Secondary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/partners#speaker">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white hover:text-black px-8 py-4 text-base font-medium backdrop-blur-sm transition-all duration-300"
                >
                  Become a Speaker
                </Button>
              </Link>
              <Link href="/community#campustour">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white hover:text-black px-8 py-4 text-base font-medium backdrop-blur-sm transition-all duration-300"
                >
                  Learn About Campus Tour
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-24" aria-labelledby="faq-section-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              id="faq-section-heading"
              className="text-3xl md:text-4xl font-bold dark:text-white mb-4"
            >
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground mt-2">
              Filtered to the &ldquo;Events &amp; Programs&rdquo; category.
            </p>
          </div>

          <FAQCarousel />
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FAQCarousel() {
  const faqsForEvents = getFAQsByCategory("Events & Programs");

  // Build slide groups of 3 FAQs each
  const perSlide = 3;
  const slides: (typeof faqsForEvents)[] = [];
  for (let i = 0; i < faqsForEvents.length; i += perSlide) {
    slides.push(faqsForEvents.slice(i, i + perSlide));
  }

  const [slideIdx, setSlideIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const next = useCallback(() => {
    setSlideIdx((s) => (s + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setSlideIdx((s) => (s - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  };

  // Autoplay: advance every 5s when not paused
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!isPaused && slides.length > 1) {
      intervalRef.current = window.setInterval(next, 5000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, slides.length, next]);

  if (slides.length === 0) {
    return (
      <p className="text-center text-muted-foreground">No FAQs available for this category.</p>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Events and Programs FAQ Carousel"
      aria-live="polite"
      aria-atomic="false"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onKeyDown={handleKey}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Slide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {slides[slideIdx].map((f, idx) => (
          <div
            key={`${f.question}-${idx}`}
            role="tabpanel"
            id={`panel-${slideIdx}-${idx}`}
            aria-label={f.question}
            className="bg-primary-light-blue rounded-lg p-6"
          >
            <h3 className="font-semibold mb-3">{f.question}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{f.answer}</p>
          </div>
        ))}
      </div>

      {/* Navigation: Prev / Dots / Next */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          {/* Previous Button */}
          <button
            onClick={() => {
              prev();
              setIsPaused(true);
            }}
            aria-label="Previous FAQ slide"
            className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronLeft className="w-5 h-5 text-primary dark:text-white" aria-hidden="true" />
          </button>

          {/* Dot Indicators */}
          <div role="tablist" aria-label="FAQ carousel slides" className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={`dot-${i}`}
                id={`tab-group-${i}`}
                role="tab"
                aria-selected={i === slideIdx}
                aria-label={`Go to slide group ${i + 1} of ${slides.length}`}
                onClick={() => {
                  setSlideIdx(i);
                  setIsPaused(true);
                }}
                className={`h-3 w-3 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  i === slideIdx
                    ? "bg-primary"
                    : "bg-primary/20 dark:bg-slate-600 hover:bg-primary/40"
                }`}
              />
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={() => {
              next();
              setIsPaused(true);
            }}
            aria-label="Next FAQ slide"
            className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronRight className="w-5 h-5 text-primary dark:text-white" aria-hidden="true" />
          </button>
        </div>
      )}

      <p className="sr-only" role="status">
        Slide {slideIdx + 1} of {slides.length}
      </p>
    </div>
  );
}
