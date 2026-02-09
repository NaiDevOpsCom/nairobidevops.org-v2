import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Phone, Mail } from "lucide-react";
import { Wallet, X } from "lucide-react";
import { Link } from "wouter";

import SocialIconLink from "@/components/SocialIconLink";
import { DONATION_CARD_ID } from "@/lib/constants";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [isDonationCardOpen, setIsDonationCardOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prevIsDonationCardOpen = useRef(isDonationCardOpen);

  // Focus management: move focus to close button when card opens, restore to trigger when closed
  useEffect(() => {
    if (isDonationCardOpen && !prevIsDonationCardOpen.current) {
      // Focus the close button when card opens (false -> true)
      closeButtonRef.current?.focus();
    } else if (!isDonationCardOpen && prevIsDonationCardOpen.current) {
      // Restore focus to trigger button when card closes (true -> false)
      buttonRef.current?.focus();
    }
    prevIsDonationCardOpen.current = isDonationCardOpen;
  }, [isDonationCardOpen]);

  // Close card when clicking outside (SSR-safe and target-guarded)
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (typeof document === "undefined") return;
    const target = event.target as Node | null;
    if (!target) return;
    if (
      cardRef.current &&
      buttonRef.current &&
      !cardRef.current.contains(target) &&
      !buttonRef.current.contains(target)
    ) {
      setIsDonationCardOpen(false);
    }
  }, []);

  // Close card on Escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsDonationCardOpen(false);
    }
  }, []);

  // Focus trap for dialog (robust handling with filtering and cycling)
  const handleFocusTrap = useCallback((event: KeyboardEvent) => {
    if (event.key !== "Tab" || !cardRef.current) return;
    const list = Array.from(
      cardRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && el.offsetParent !== null
    );
    if (list.length <= 1) return;
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey) {
      if (active === first || !active || !cardRef.current.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !active || !cardRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isDonationCardOpen) {
      document.addEventListener("mousedown", handleClickOutside, { passive: true });
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keydown", handleFocusTrap);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", handleFocusTrap);
    };
  }, [isDonationCardOpen, handleClickOutside, handleKeyDown, handleFocusTrap]);

  return (
    <>
      <footer className="bg-primary-light-blue dark:bg-ndc-darkblue/[.59] text-foreground pt-10 pb-4 px-2 md:px-0 border-t border-gray-300 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Logo & Affiliates */}
            <div>
              <div className="flex items-center gap-6 mb-6">
                <img
                  src="https://res.cloudinary.com/nairobidevops/image/upload/v1751295185/My%20Brand/devOpsLogo-EpoD6axe_wgwtya.png"
                  alt="DevOps Logo"
                  className="h-16 w-auto object-contain"
                />
              </div>
              <div className="font-bold mb-1 mt-4 text-base">Our Affiliates</div>
              <div className="text-sm mb-2 text-gray-700 dark:text-gray-300">
                In collaboration with{" "}
                <a
                  href="https://africadevops.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline transition-colors"
                >
                  Africa DevOps Summit
                </a>
              </div>

              <div className="flex flex-row items-center space-x-5 mt-6 mb-2">
                <SocialIconLink network="x" value="https://x.com/nairobidevops" variant="simple" />
                <SocialIconLink
                  network="linkedin"
                  value="https://www.linkedin.com/company/nairobidevops/"
                  variant="simple"
                />
                <SocialIconLink
                  network="instagram"
                  value="https://instagram.com/nairobidevops"
                  variant="simple"
                />
                <SocialIconLink
                  network="youtube"
                  value="https://www.youtube.com/@NairobiDevopsCommunity"
                  variant="simple"
                />
                <SocialIconLink
                  network="facebook"
                  value="https://www.facebook.com/p/Nairobi-DevOps-Community-61562060464876/"
                  variant="simple"
                />
                <SocialIconLink
                  network="whatsapp"
                  value="https://www.whatsapp.com/channel/0029VbB0nYp4tRrwhzvySL1S"
                  variant="simple"
                />
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <div className="font-bold mb-2">Quick Links</div>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/learn" className="hover:text-primary transition-colors">
                    Learn with Us
                  </Link>
                </li>
                <li>
                  <Link href="/shop" className="hover:text-primary transition-colors">
                    Shop our Merchants
                  </Link>
                </li>
                <li>
                  <Link href="/faqpage" className="hover:text-primary transition-colors">
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link href="/branding" className="hover:text-primary transition-colors">
                    Brand Guidelines
                  </Link>
                </li>
                <li>
                  <Link href="/partners" className="hover:text-primary transition-colors">
                    Partners & Sponsors
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Us */}
            <div>
              <div className="font-bold mb-2">Contact Us</div>
              <div className="flex items-center text-sm mb-2">
                <Phone className="h-4 w-4 text-primary mr-2" />
                <a href="tel:+254796445130" className="hover:underline hover:text-primary">
                  +254 796 445130
                </a>
              </div>
              <div className="flex items-center text-sm mb-2">
                <Mail className="h-4 w-4 text-primary mr-2" />
                <a
                  href="mailto:info@nairobidevops.org"
                  className="hover:underline hover:text-primary"
                >
                  info@nairobidevops.org
                </a>
              </div>
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 text-primary mr-2" />
                <span>Nairobi, Kenya</span>
              </div>
            </div>

            {/* Newsletter */}
            <div id="newsletter" className="md:col-span-1">
              {/* Gradient border wrapper */}
              <div className="relative p-[2px] rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 transition-all duration-300 hover:shadow-lg">
                <div className="bg-white hover:bg-primary-light-blue dark:bg-gray-900 dark:hover:bg-gray-800 rounded-xl p-5 transition-colors duration-300">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-primary leading-tight">
                        Nairobi DevOps Community Newsletter
                      </h3>
                    </div>
                  </div>

                  {/* Social proof */}
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Top rated Community Newsletter with{" "}
                    <span className="font-semibold text-gray-800 dark:text-white">
                      thousands of
                    </span>{" "}
                    members
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Get curated insights and career tips
                  </p>

                  {/* Brand & CTA */}
                  <div className="text-center">
                    <a
                      href="https://nairobidevops.substack.com/subscribe"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Subscribe Now (opens in a new tab)"
                      className="inline-block text-lg px-8 py-4 font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-white bg-primary hover:bg-ndc-darkblue text-center"
                    >
                      Subscribe Now
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <hr className="border-gray-300 my-4" />
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-foreground gap-2">
            <div>&copy; 2023–{currentYear} Nairobi DevOps Community. Powered by the Community.</div>
            <div className="flex gap-4">
              <Link
                href="/code-of-conduct"
                className="hover:underline hover:text-primary transition-colors"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                Code of Conduct
              </Link>
              <Link
                href="/terms"
                className="hover:underline hover:text-primary transition-colors"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                Terms & Conditions
              </Link>
              <Link
                href="/privacy"
                className="hover:underline hover:text-primary transition-colors"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Donation Button & Card - Outside footer landmark for accessibility */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Donation Card - Animated */}
        <div
          ref={cardRef}
          id={DONATION_CARD_ID}
          className={`absolute bottom-16 right-0 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 transition-all duration-300 origin-bottom-right ${
            isDonationCardOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-4 pointer-events-none"
          }`}
          role="dialog"
          aria-labelledby="donation-card-title"
          aria-describedby="donation-card-desc"
          aria-hidden={isDonationCardOpen ? "false" : "true"}
          aria-modal="true"
          aria-live="polite"
        >
          {/* Close button */}
          <button
            ref={closeButtonRef}
            onClick={() => setIsDonationCardOpen(false)}
            aria-label="Close donation card"
            tabIndex={isDonationCardOpen ? 0 : -1}
            className="absolute -top-3 -right-3 w-8 h-8 bg-primary hover:bg-ndc-darkblue text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Card content */}
          <div className="p-6">
            <h3 id="donation-card-title" className="text-xl font-bold text-primary mb-3">
              Support a DevOps Enthusiast
            </h3>
            <p
              id="donation-card-desc"
              className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4"
            >
              Did you know that by donating{" "}
              <span className="font-semibold text-gray-800 dark:text-white">$20</span> (~KES 2,600),
              you&apos;re helping one aspiring DevOps engineer take a step closer to accessing
              learning resources?
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-5">
              Your contribution supports workshops, mentorship programs, and community-driven
              learning initiatives.
            </p>

            {/* CTA Button */}
            <Link
              href={`/donate#${DONATION_CARD_ID}`}
              tabIndex={isDonationCardOpen ? 0 : -1}
              onClick={() => {
                setIsDonationCardOpen(false);
                // If we are already on the donate page, we need to manually trigger scroll
                if (typeof window !== "undefined" && window.location.pathname === "/donate") {
                  const element = document.getElementById(DONATION_CARD_ID);
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                  }
                }
              }}
              className="block w-full py-3 px-6 bg-primary hover:bg-ndc-darkblue text-white text-center font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              I&apos;ll donate now
            </Link>
          </div>
        </div>

        {/* Floating Donation Button */}
        <button
          ref={buttonRef}
          onClick={() => setIsDonationCardOpen(!isDonationCardOpen)}
          aria-label={isDonationCardOpen ? "Close donation card" : "Open donation card"}
          aria-expanded={isDonationCardOpen}
          aria-controls="donation-card"
          className="flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-gray-800 text-primary shadow-xl border-2 border-primary hover:border-primary hover:shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Wallet className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}
