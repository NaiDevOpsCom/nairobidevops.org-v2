import { Plus } from "lucide-react";
import React, { useState, useEffect } from "react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { faqDataByCategory } from "@/data/faqData";

const CATEGORY_BACKGROUNDS = [
  "bg-white/80",
  "bg-blue-50/80",
  "bg-slate-50/80",
  "bg-sky-50/80",
  "bg-cyan-50/80",
] as const;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Community:
    "Understand our mission, how we collaborate, and what makes the Nairobi DevOps Community a welcoming space for engineers, builders, and learners.",
  Membership:
    "Everything you need to know about joining, member benefits, and ways to contribute or volunteer within the community.",
  "Events & Programs":
    "Get insight into our monthly meetups, workshops, bootcamps, and flagship conferences that keep DevOps skills sharp.",
  "Jobs & Opportunities":
    "Explore how we share hiring leads, freelance roles, and ways organizations connect with vetted DevOps talent.",
  "Sponsorship & Partnership":
    "Learn how partners collaborate with us, support our initiatives, and showcase their brand to thousands of practitioners.",
};

// FAQ JSON-LD Schema — generates rich snippets in Google
const generateFAQSchema = (): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqDataByCategory.flatMap((category) =>
    category.items.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    }))
  ),
});

export default function FAQPage() {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Small timeout to bypass ESLint warning about synchronous setState in effect
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleItem = (id: string) => {
    setActiveItem((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[var(--faq-bg)] text-[var(--faq-text)]">
      <SEO
        title="Frequently Asked Questions"
        description="Find answers to common questions about Nairobi DevOps Community — membership, events, partnerships, job opportunities, and sponsorship."
        canonical="https://nairobidevops.org/faq"
        structuredData={generateFAQSchema()}
      />

      <a
        href="#main-content"
        className="
          sr-only focus:not-sr-only
          focus:fixed focus:top-4 focus:left-4 focus:z-50
          focus:bg-primary focus:text-white
          focus:px-4 focus:py-2 focus:rounded-md
          focus:shadow-lg focus:outline-none
          transition-all duration-200
        "
      >
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content" className="py-20">
        <section
          className="relative overflow-hidden mb-16"
          aria-label="Frequently Asked Questions hero"
        >
          <div className="absolute inset-0">
            <img
              src="https://ik.imagekit.io/nairobidevops/ndc-assets/PXL_20230701_101030400.MP.jpg?updatedAt=1755157330731"
              alt=""
              role="presentation"
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--faq-bg)]/95 via-[var(--faq-bg)]/90 to-transparent" />
          </div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
            <h1
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: "var(--faq-text)" }}
            >
              Frequently Asked Questions
            </h1>
            <p
              className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
              style={{ color: "var(--faq-text)" }}
            >
              Explore clear, concise answers to common questions about the Nairobi DevOps Community
              — from membership and events to platform features and contribution opportunities.
            </p>
          </div>
        </section>

        <div
          className={`transition-opacity duration-1000 ease-out ${
            isMounted ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {faqDataByCategory.map((category, categoryIndex) => {
              const sectionBg = CATEGORY_BACKGROUNDS[categoryIndex % CATEGORY_BACKGROUNDS.length];

              const sectionHeadingId = `faq-category-heading-${categoryIndex}`;

              return (
                <section
                  key={category.title}
                  aria-labelledby={sectionHeadingId}
                  className={`rounded-2xl border shadow-sm ${sectionBg}`}
                  style={{ borderColor: "var(--faq-text)", opacity: 0.95 }}
                >
                  <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start p-6 md:p-8 lg:p-10">
                    <div>
                      <h2
                        id={sectionHeadingId}
                        className="text-2xl md:text-3xl font-semibold mb-3"
                        style={{ color: "var(--faq-text)" }}
                      >
                        {category.title} FAQs
                      </h2>
                      <p
                        className="text-sm md:text-base leading-relaxed opacity-80"
                        style={{ color: "var(--faq-text)" }}
                      >
                        {CATEGORY_DESCRIPTIONS[category.title] ??
                          "Questions and answers tailored to this part of the Nairobi DevOps Community experience."}
                      </p>
                    </div>

                    {/* Right: Questions & Answers */}
                    <div className="space-y-4">
                      {category.items.map((faq, itemIndex) => {
                        const id = `${categoryIndex}-${itemIndex}`;

                        const isExpanded = activeItem === id;

                        return (
                          <div
                            key={id}
                            className="rounded-lg shadow-sm border overflow-hidden"
                            style={{
                              backgroundColor: "var(--faq-bg)",
                              borderColor: "var(--faq-text)",
                              opacity: 0.9,
                            }}
                          >
                            {/* Question Button */}
                            <button
                              type="button"
                              id={`faq-question-${id}`}
                              className="w-full flex items-center justify-between px-6 py-4 cursor-pointer transition-colors text-left"
                              style={{
                                backgroundColor: "var(--faq-bg)",
                                color: "var(--faq-text)",
                              }}
                              onClick={() => toggleItem(id)}
                              aria-expanded={isExpanded}
                              aria-controls={`faq-answer-${id}`}
                            >
                              <span
                                className="font-medium flex-1"
                                style={{ color: "var(--faq-text)" }}
                              >
                                {faq.question}
                              </span>
                              <span
                                className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors ml-4 flex-shrink-0"
                                aria-hidden="true"
                              >
                                <Plus
                                  className={`w-4 h-4 transition-transform duration-300 ${
                                    isExpanded ? "rotate-45" : "rotate-0"
                                  }`}
                                />
                              </span>
                            </button>

                            <div
                              id={`faq-answer-${id}`}
                              role="region"
                              aria-labelledby={`faq-question-${id}`}
                              aria-hidden={!isExpanded}
                              className={`
                                overflow-hidden transition-all duration-300 ease-in-out
                                ${isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}
                              `}
                            >
                              <div
                                className="px-6 pb-5 pt-4 border-t"
                                style={{ borderColor: "var(--faq-text)" }}
                              >
                                <p
                                  className="leading-relaxed"
                                  style={{ color: "var(--faq-text)", opacity: 0.85 }}
                                >
                                  {faq.answer}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* ── Contact Section ───────────────────────────────────────────── */}
        <div
          className="mt-16 max-w-4xl mx-auto text-center p-8 rounded-lg border"
          style={{ borderColor: "var(--faq-text)", opacity: 0.8 }}
        >
          <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--faq-text)" }}>
            Still have questions?
          </h3>
          <p className="text-lg mb-6" style={{ color: "var(--faq-text)" }}>
            Can&apos;t find the answer you&apos;re looking for? We&apos;d love to hear from you.
          </p>

          <Button
            asChild
            className="px-8 py-4 text-lg font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            style={{
              backgroundColor: "var(--faq-text)",
              color: "var(--faq-bg)",
            }}
          >
            <a
              href="mailto:info@nairobidevops.org"
              aria-label="Send an email to Nairobi DevOps Community"
            >
              Contact Us
            </a>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
