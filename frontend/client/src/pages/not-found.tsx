import { Link } from "wouter";

import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <SEO
        title="404 - Page Not Found"
        description="Page not found. The page you are looking for does not exist."
        robots="noindex, follow"
      />
      <Navbar />
      <main className="w-full flex items-center justify-center bg-background py-20">
        <div className="text-center px-4 max-w-3xl">
          {/* Headline */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 text-foreground">
            Oops! <span className="font-normal">This pipeline hit a dead end...</span>
          </h1>
          {/* Error 404 */}
          <div className="mb-8">
            <div className="flex items-baseline justify-center gap-3 md:gap-4">
              <span className="text-4xl md:text-6xl font-medium text-primary">Error</span>
              <span className="text-8xl md:text-[12rem] lg:text-[14rem] font-bold text-primary leading-none">
                404
              </span>
            </div>
          </div>
          {/* Description */}
          <p className="text-base md:text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Looks like the page you&apos;re searching for didn&apos;t deploy correctly. Don&apos;t
            worry, even the best DevOps angels sometimes miss a commit.
          </p>
          {/* Navigation Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-base md:text-lg">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-primary text-white hover:bg-[#023047] transition-colors duration-200"
            >
              <Link href="/">Back to Home</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto hover:bg-primary transition-colors duration-200"
            >
              <a href="mailto:info@nairobidevops.org">Contact Us</a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
