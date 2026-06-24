import Footer from "@/components/Footer";
import AboutSection from "@/components/landing/AboutSection";
import Events from "@/components/landing/Events";
import FAQSection from "@/components/landing/FAQSection";
import Gallery from "@/components/landing/Gallery";
import HeroSection from "@/components/landing/HeroSection";
import JoinCommunity from "@/components/landing/JoinCommunity";
import Partners from "@/components/landing/Partners";
import Testimonials from "@/components/landing/Testimonials";
import WhatWeDo from "@/components/landing/WhatWeDo";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <WhatWeDo />
      <Partners />
      <Events />
      <Testimonials />
      <Gallery />

      <FAQSection />
      <JoinCommunity />
      <Footer />
    </div>
  );
}
