import { Link } from "wouter";

import { Button } from "@/components/ui/button";

export default function AfricaDevOpsSummitSection() {
  return (
    <section className="py-16 lg:py-24 bg-ndc-darkblue text-white relative overflow-hidden dark:bg-accent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center">
        <div className="w-full max-w-5xl bg-primary-light-blue backdrop-blur-sm rounded-3xl p-8 md:p-12 lg:p-16 text-center border border-white/10 shadow-2xl dark:bg-white/60">
          <div className="mb-6 flex justify-center">
            <img
              src="https://res.cloudinary.com/nairobidevops/image/upload/v1756885757/ads-logos-colors_l8bvoh.svg"
              alt="Africa DevOps Summit"
              className="h-48 md:h-64 w-auto object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-3">
            Africa DevOps Summit
          </h2>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 font-primary">
            Where Africa’s DevOps voices unite
          </h3>

          <p className="text-lg md:text-xl text-gray-700 max-w-4xl mx-auto mb-10 leading-relaxed">
            Africa’s flagship DevOps gathering brings together engineers, innovators, and community
            leaders from across the continent. Nairobi DevOps members join to learn, share, and
            showcase our innovation on a continental stage.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-ndc-darkblue text-white px-8 py-6 text-lg font-semibold shadow-lg transition-all duration-300 w-full sm:w-auto"
            >
              <a href="https://www.devopssummit.africa/" target="_blank" rel="noopener noreferrer">
                Explore the Summit
              </a>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-transparent border-2 border-gray-400 text-gray-900 hover:bg-white hover:text-primary hover:border-primary px-8 py-6 text-lg font-semibold transition-all duration-300 w-full sm:w-auto dark:border-gray-600 dark:text-gray-900"
            >
              <Link href="/community#empowering-community">Join Nairobi DevOps at ADS</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
