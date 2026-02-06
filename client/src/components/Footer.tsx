import { MapPin, Phone, Mail, ArrowUp } from "lucide-react";
import { Link } from "wouter";

import SocialIconLink from "@/components/SocialIconLink";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
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
            <div className="text-sm mb-2 text-[#444]">
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
                <a href="/learn" className="hover:text-primary transition-colors">
                  Learn with Us
                </a>
              </li>
              <li>
                <a href="/shop" className="hover:text-primary transition-colors">
                  Shop our Merchants
                </a>
              </li>
              <li>
                <a href="/faqpage" className="hover:text-primary transition-colors">
                  FAQs
                </a>
              </li>
              <li>
                <a href="/branding" className="hover:text-primary transition-colors">
                  Brand Guidelines
                </a>
              </li>
              <li>
                <a href="/partners" className="hover:text-primary transition-colors">
                  Partners & Sponsors
                </a>
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
                  <span className="font-semibold text-gray-800 dark:text-white">5,000+</span>{" "}
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
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Code of Conduct
            </Link>
            <Link
              href="/terms"
              className="hover:underline hover:text-primary transition-colors"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Terms & Conditions
            </Link>
            <Link
              href="/privacy"
              className="hover:underline hover:text-primary transition-colors"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Floating Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:bg-ndc-darkblue hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </footer>
  );
}
