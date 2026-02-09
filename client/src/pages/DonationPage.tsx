import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

import { DONATION_CARD_ID } from "@/lib/constants";
import { seededRandom } from "@/lib/random";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { communityGallery } from "@/data/galleryData";
import { statisticsData } from "@/data/ndcData";
import StatisticCounter from "@/components/ui/StatisticCounter";

const supportOptions = [
  {
    title: "Make a one-time donation",
    description: "Contribute any amount to help fund workshops, mentorship, and community events.",
  },
  {
    title: "Become a monthly supporter",
    description: "Set up recurring contributions to sustain long-term growth and stability.",
  },
  {
    title: "Corporate partnership",
    description:
      "Collaborate with us to strengthen Kenya's tech ecosystem while showcasing your brand's commitment to innovation.",
  },
  {
    title: "Provide resources",
    description:
      "Offer venues, equipment, or learning materials to support our events and trainings.",
  },
  {
    title: "Sponsor a program",
    description:
      "Partner with us to fund specific initiatives like scholarships, hackathons, or open-source projects.",
  },
  {
    title: "Volunteer your expertise",
    description:
      "Mentor, speak, or lead sessions to inspire and guide the next generation of DevOps engineers.",
  },
];

// Helper to get random images deterministically for client-side rendering
const getRandomImages = (count: number) => {
  if (!communityGallery || communityGallery.length === 0) {
    return [
      {
        url: "https://ik.imagekit.io/nairobidevops/ndcAssets/IMG_9567.jpg?updatedAt=1764488001475",
        alt: "Tech conference presentation",
      },
      {
        url: "https://ik.imagekit.io/nairobidevops/ndcAssets/PXL_20230923_053327396.jpg?updatedAt=1764488001466",
        alt: "Community collaboration",
      },
      {
        url: "https://ik.imagekit.io/nairobidevops/ndcAssets/PXL_20230701_101028361.MP.jpg?updatedAt=1764488001423",
        alt: "Workshop session",
      },
    ].slice(0, count);
  }

  const pool = communityGallery.flatMap((img) => (img.priority ? [img, img] : [img]));
  const picked: { url: string; alt: string }[] = [];
  const used = new Set<string>();
  let attempts = 0;

  while (picked.length < count && attempts < 30) {
    const idx = Math.floor(seededRandom() * pool.length);
    const p = pool[idx];
    if (!used.has(p.url)) {
      used.add(p.url);
      picked.push({ url: p.url, alt: p.alt || "Community image" });
    }
    attempts++;
  }

  // Fill with fallbacks if needed
  const fallbacks = [
    {
      url: "https://ik.imagekit.io/nairobidevops/ndcAssets/IMG_9567.jpg?updatedAt=1764488001475",
      alt: "Tech conference presentation",
    },
    {
      url: "https://ik.imagekit.io/nairobidevops/ndcAssets/PXL_20230923_053327396.jpg?updatedAt=1764488001466",
      alt: "Community collaboration",
    },
    {
      url: "https://ik.imagekit.io/nairobidevops/ndcAssets/PXL_20230701_101028361.MP.jpg?updatedAt=1764488001423",
      alt: "Workshop session",
    },
  ];

  let i = 0;
  while (picked.length < count && i < fallbacks.length) {
    if (!used.has(fallbacks[i].url)) {
      picked.push(fallbacks[i]);
      used.add(fallbacks[i].url);
    }
    i++;
  }

  return picked;
};

function ImpactImagesGrid() {
  // Use lazy initialization for random images to avoid effect dependencies
  const [imgs] = useState(() => getRandomImages(3));

  return (
    <>
      <div className="col-span-2 h-64 rounded-xl overflow-hidden shadow-lg">
        <img
          src={imgs[0].url}
          alt={imgs[0].alt}
          className="w-full h-full object-cover hover-scale"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="h-48 rounded-xl overflow-hidden shadow-lg">
        <img
          src={imgs[1].url}
          alt={imgs[1].alt}
          className="w-full h-full object-cover hover-scale"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="h-48 rounded-xl overflow-hidden shadow-lg">
        <img
          src={imgs[2].url}
          alt={imgs[2].alt}
          className="w-full h-full object-cover hover-scale"
          loading="lazy"
          decoding="async"
        />
      </div>
    </>
  );
}

export default function DonationPage() {
  const [location] = useLocation();

  // Handle hash scrolling on mount and location changes with whitelist
  useEffect(() => {
    if (typeof window === "undefined") return;
    const allowedAnchors = new Set([`#${DONATION_CARD_ID}`]);

    const scrollToAllowedHash = () => {
      const { hash } = window.location;
      if (!allowedAnchors.has(hash)) return;
      const timer = setTimeout(() => {
        const id = hash.slice(1);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
      // Clear any pending timer on next call
      return () => clearTimeout(timer);
    };

    const cleanup = scrollToAllowedHash();
    window.addEventListener("hashchange", scrollToAllowedHash);
    return () => {
      window.removeEventListener("hashchange", scrollToAllowedHash);
      if (typeof cleanup === "function") cleanup();
    };
  }, [location]);

  // State for backgrounds using lazy initialization

  const [heroBackground] = useState(() => {
    if (!communityGallery?.length) return "";
    const pool = communityGallery.flatMap((img) => (img.priority ? [img, img] : [img]));
    const idx = Math.floor(seededRandom() * pool.length);
    return pool[idx]?.url || "";
  });

  const [bottomHeroBackground] = useState(() => {
    if (!communityGallery?.length) {
      return "https://ik.imagekit.io/nairobidevops/ndcAssets/IMG_9567.jpg?updatedAt=1764488001475";
    }
    const pool = communityGallery.flatMap((img) => (img.priority ? [img, img] : [img]));
    const idx = Math.floor(seededRandom() * pool.length);
    return pool[idx]?.url || "";
  });

  // Helper: ensure background values are normalized to a string URL
  const normalizeBgUrl = (val: unknown): string => {
    if (typeof val === "string") return val;
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0];
      if (typeof first === "object" && first !== null && "url" in first) {
        return (first as { url: string }).url;
      }
    }
    return "";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <Navbar />

      {/* Hero Section */}
      <header
        className="relative min-h-[50vh] flex items-center justify-center text-center"
        style={{
          backgroundImage: `url('${normalizeBgUrl(heroBackground)}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Support a Mission of <span className="text-primary">Growth and Opportunity</span>
          </h1>
          <p className="text-md md:text-lg text-white/80 max-w-3xl mx-auto mb-8">
            Your donation fuels workshops, mentorship, and open-source projects that uplift
            Kenya&apos;s DevOps community. Together, we&apos;re building inclusive spaces where
            developers grow, innovate, and inspire the next generation.
          </p>
        </div>
      </header>

      {/* How to support Section */}
      <section className="py-12 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-16 text-foreground font-poppins">
            How to support Nairobi Devops
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-y-12 md:gap-x-8">
            {supportOptions.map((option, index) => (
              <div
                key={index}
                className="flex flex-col items-start gap-2 sm:gap-3 group cursor-pointer p-4 sm:p-0 rounded-lg hover:bg-muted/50 sm:hover:bg-transparent transition-colors"
              >
                <div className="flex items-center gap-2 text-primary font-semibold text-base sm:text-lg group-hover:underline">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1 shrink-0" />
                  <span>{option.title}</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed pl-6 sm:pl-0">
                  {option.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 bg-primary-light-blue dark:bg-ndc-darkblue">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            {/* Impact - Images Grid (randomized from communityGallery for better reuse + perf) */}
            <div className="w-full lg:w-1/2 grid grid-cols-2 gap-4">
              <ImpactImagesGrid />
            </div>

            {/* Impact - Content */}
            <div className="w-full lg:w-1/2 space-y-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 font-poppins text-foreground">
                  Our Impact in Numbers
                </h2>
                <p className="text-muted-foreground text-lg">
                  Every contribution fuels measurable change. Here&apos;s how your support has
                  shaped our community
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-4">
                {statisticsData.map((stat) => (
                  <div key={stat.id} className="space-y-1 text-left">
                    <StatisticCounter
                      endValue={stat.number}
                      className="text-3xl font-bold text-primary font-poppins"
                    />
                    <p className="text-sm text-foreground/80 font-medium leading-tight">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Donation Form CTA Section */}
      <section className="py-24 bg-background relative overflow-hidden" id={DONATION_CARD_ID}>
        {/* Background Image Effect for this section if needed, or just white/dark bg */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            {/* Left Text */}
            <div className="w-full lg:w-1/2 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold font-poppins text-foreground leading-tight">
                Give What You Can. Change <br /> What You Can.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Every contribution, big or small, fuels workshops, mentorship, and scholarships.
                Together, we transform Nairobi&apos;s DevOps community, empowering developers to
                grow, innovate, and inspire lasting change.
              </p>
            </div>

            {/* Right Donation Card */}
            <div className="w-full lg:w-1/2">
              <div className="bg-ndc-darkblue rounded-xl p-8 md:p-12 text-center text-white shadow-2xl max-w-md mx-auto lg:ml-auto">
                <h3 className="text-xl md:text-2xl font-bold mb-8 text-primary font-poppins">
                  Your Donation Has The Power To Transform Lives.
                </h3>

                <div className="space-y-4">
                  <a
                    href="https://web.mypayd.app/link/support-the-nairobi-devops-community"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-block text-center bg-primary hover:bg-background hover:text-primary text-white font-bold py-3 rounded-md transition-colors duration-200"
                  >
                    Donate Now
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Hero / Inspiring Image Section */}
      <section className="w-full h-[400px] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${normalizeBgUrl(bottomHeroBackground)}')` }}
        >
          <div className="absolute inset-0 bg-nairobi-dark/60 mix-blend-multiply" />
          <div className="absolute inset-0 bg-black/20" />

          <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
            <div className="max-w-4xl">
              <h2 className="text-3xl md:text-5xl font-bold text-primary mb-6 ">
                What Your Gift Makes Possible
              </h2>
              <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto">
                Your donation funds workshops, mentorship, and events, empowering developers,
                breaking barriers, and sustaining Nairobi&apos;s DevOps community to innovate, grow,
                and inspire future tech leaders.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
