import { useState } from "react";
import { Users, Linkedin } from "lucide-react";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { communityGallery } from "@/data/galleryData";
import { getRandomItems } from "@/utils/getRandomItems";

export default function JoinCommunity() {
  const [, navigate] = useLocation();
  const [bgImage] = useState<string>(() => {
    const randomImage = getRandomItems(communityGallery, 1)[0];
    return randomImage ? randomImage.url : "";
  });

  const handleJoinClick = () => {
    navigate("/community");
  };

  const handleLinkedInClick = () => {
    window.open("https://www.linkedin.com/company/nairobidevops/", "_blank", "noopener,noreferrer");
  };

  const handleXClick = () => {
    window.open("https://x.com/nairobidevops", "_blank", "noopener,noreferrer");
  };

  return (
    <section
      className="relative py-20 overflow-hidden bg-cover bg-center bg-no-repeat transition-all duration-700"
      style={{
        backgroundImage: bgImage ? `url("${encodeURI(bgImage)}")` : undefined,
        backgroundColor: "#000000",
      }}
    >
      <div className="absolute inset-0 bg-black/70"></div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">Join Our Community</h2>
        <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Be part of Nairobi’s growing DevOps movement.
        </h3>
        <p className="text-lg md:text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
          Connect with fellow DevOps learners, builders, and leaders. Jump into conversations, share
          ideas, and grow with us.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Button
            size="lg"
            className="flex items-center text-lg px-8 py-4 hover:bg-[#023047] transition-colors duration-200 overflow-hidden"
            onClick={handleJoinClick}
          >
            <Users className="mr-3 h-5 w-5" />
            Join Our Community
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex items-center text-lg px-8 py-4 bg-white/10 border-white/20 text-white hover:bg-white hover:text-black overflow-hidden"
            onClick={handleLinkedInClick}
          >
            <Linkedin className="mr-3 h-5 w-5" />
            Connect On LinkedIn
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex items-center text-lg px-8 py-4 bg-white/10 border-white/20 text-white hover:bg-white hover:text-black overflow-hidden"
            onClick={handleXClick}
          >
            <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.53 2.477h3.924l-8.56 9.85 10.09 13.196h-7.98l-6.25-8.19-7.16 8.19H.07l9.13-10.51L0 2.477h8.13l5.77 7.57zm-1.13 17.03h2.17L7.1 4.36H4.8z" />
            </svg>
            Follow On X
          </Button>
        </div>
      </div>
    </section>
  );
}
