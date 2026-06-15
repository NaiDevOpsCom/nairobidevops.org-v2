import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { allData } from "@/data/whatWeDoData";

export default function WhatWeDo() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
    },
    [Autoplay({ delay: 3500, stopOnInteraction: true, stopOnMouseEnter: true })]
  );

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setActiveIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <section className="py-16 bg-ndc-darkblue dark:bg-ndc-darkblue transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">What We Do</h2>
          <p className="text-base md:text-lg text-white/80 max-w-3xl mx-auto">
            We&apos;re more than a meetup—we&apos;re a movement. Nairobi DevOps Community exists to
            empower, connect, and grow the next generation of tech talent through:
          </p>
        </div>

        {/* carousel  */}
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6 will-change-transform">
              {allData.whatWeDo.map((service, index) => (
                <div key={index} className="embla__slide shrink-0 px-2 w-full sm:w-1/2 md:w-1/3">
                  <div className="mx-auto max-w-[360px] h-full">
                    <Card className="bg-primary-light-blue rounded-lg shadow-md border-0 w-full h-full">
                      <CardContent className="p-6 md:p-8 text-center flex flex-col items-center h-full">
                        <div className="shrink-0 w-12 h-12 mb-4 flex items-center justify-center">
                          <service.icon className="text-primary h-12 w-12" />
                        </div>
                        <h3 className="text-lg md:text-xl font-bold mb-2 text-black-overlay">
                          {service.title}
                        </h3>
                        <p className="text-sm md:text-base leading-relaxed mt-2 flex-1 text-black-overlay80">
                          {service.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prev / Next controls */}
          <div className="absolute inset-y-1/2 left-2 transform -translate-y-1/2">
            <button
              aria-label="Previous"
              onClick={() => emblaApi && emblaApi.scrollPrev()}
              className="bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-md"
            >
              ‹
            </button>
          </div>
          <div className="absolute inset-y-1/2 right-2 transform -translate-y-1/2">
            <button
              aria-label="Next"
              onClick={() => emblaApi && emblaApi.scrollNext()}
              className="bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-md"
            >
              ›
            </button>
          </div>
        </div>

        {/* Dot indicator for carousel/pagination */}
        <div className="flex justify-center mt-6 space-x-3">
          {allData.whatWeDo.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => emblaApi && emblaApi.scrollTo(idx)}
              className={`w-3 h-3 rounded-full transition-colors duration-300 focus:outline-none ${
                idx === activeIndex ? "bg-[#2563eb]" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
