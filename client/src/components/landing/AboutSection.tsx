import { Users, Calendar, Handshake, GraduationCap, Award } from "lucide-react";
import React from "react";
import { useLocation } from "wouter";

import StatisticCounter from "../ui/StatisticCounter";

import { Button } from "@/components/ui/button";
import { statisticsData } from "@/data/ndcData";

const iconMap: { [key: string]: React.ElementType } = {
  Users,
  Calendar,
  Handshake,
  GraduationCap,
  Award,
};

export default function AboutSection() {
  const [, navigate] = useLocation();

  const handleKnowUsClick = () => {
    navigate("/about");
  };

  const displayedStats = statisticsData.filter((stat) =>
    ["Community Members", "Events", "Partners"].includes(stat.label)
  );

  return (
    <section
      id="about"
      className="py-20 bg-[#d3d3d3] dark:bg-ndc-darkblue transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary dark:text-primary">
            About Us
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Video Player on the Left */}
          <div className="relative">
            <div className="relative aspect-video bg-muted rounded-2xl overflow-hidden shadow-2xl">
              <iframe
                src="https://www.youtube.com/embed/TLbR9oIszas"
                title="About Nairobi DevOps"
                className="w-full h-full rounded-2xl"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Text Content on the Right */}
          <div className="space-y-6 text-foreground dark:text-white">
            <h3 className="text-2xl font-semibold mb-4">
              Building a Stronger Tech Community Through DevOps.
            </h3>
            <p className="text-foreground dark:text-white leading-relaxed">
              As part of Nairobi’s growing tech ecosystem, we’re fostering inclusive learning,
              collaboration, and innovation among DevOps engineers, developers, designers, students,
              and tech enthusiasts across Kenya and beyond.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-8 bg-primary-light-blue dark:bg-[#FFFFFF99] rounded-xl p-6">
              {displayedStats.map((stat) => {
                const Icon = stat.icon ? iconMap[stat.icon] : null;
                return (
                  <div key={stat.id} className="flex items-center gap-4">
                    {Icon && <Icon className="h-10 w-10 text-primary shrink-0" />}
                    <div className="text-left">
                      <div className="text-2xl font-bold text-foreground dark:text-black">
                        <StatisticCounter endValue={stat.number} />
                      </div>
                      <div className="text-sm text-muted-foreground dark:text-black">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center space-x-4 pt-4 ">
              <Button
                size="lg"
                className="hover:bg-ndc-darkblue transition-colors duration-200 dark:hover:bg-white dark:text-black"
                onClick={handleKnowUsClick}
              >
                Get to Know Us
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
