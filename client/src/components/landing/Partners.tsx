import { Handshake } from "lucide-react";
import React from "react";
import { useLocation } from "wouter";

import { SponsorsCarousel } from "../SponsorsCarousel";

import { Button } from "@/components/ui/button";

export default function Partners() {
  const [, setLocation] = useLocation();
  return (
    <section className="py-16 md:py-24 bg-accent dark:bg-muted-foreground transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Our Partners & Supporters
          </h2>
          <p className="text-muted-foreground dark:text-white">
            Collaborating to Grow Kenya&apos;s DevOps and Tech Talent
          </p>
        </div>

        {/* New Sponsors Carousel */}
        <div className="mb-8">
          <SponsorsCarousel />
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-8">
          <Button
            className="bg-primary text-white flex items-center justify-center hover:bg-ndc-darkblue transition-colors duration-200"
            onClick={() => setLocation("/partners")}
          >
            <Handshake className="h-5 w-5 text-white mr-2" />
            Partner with us
          </Button>
        </div>
      </div>
    </section>
  );
}
