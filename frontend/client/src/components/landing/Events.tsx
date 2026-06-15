import React from "react";
import { useLocation } from "wouter";

import LumaEventsList from "@/components/events/LumaEventsList";
import RecordedVideoCard from "@/components/RecordedVideoCard.tsx";
import { Button } from "@/components/ui/button";
import { recordedSessions } from "@/data/communityPageData.ts";
import { getRandomItems } from "@/utils/getRandomItems";

export default function Events() {
  const [, navigate] = useLocation();
  const randomRecorded = React.useMemo(() => getRandomItems(recordedSessions, 4), []);
  return (
    <section
      id="events"
      className="py-20 bg-slate-50 dark:bg-ndc-darkblue transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Events & Meetups
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Join us for hands-on sessions, tech talks, and community meetups designed to sharpen
            your skills and elevate your DevOps journey.
          </p>
        </div>

        {/* Upcoming events from Luma Calendar */}
        <div className="mb-16">
          <h3 className="text-2xl md:text-3xl font-bold text-primary text-center mb-12">
            Upcoming Events
          </h3>
          <LumaEventsList />
        </div>

        {/* Past Events */}
        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-primary text-center mb-12">
            Past Events
          </h3>
          <p className="text-center text-muted-foreground mb-8">
            Missed an event? Check out our recorded sessions below.
          </p>

          <div className="max-w-7xl mx-auto">
            <div className="grid grid-flow-col auto-cols-[min(80%,320px)] gap-6 overflow-x-auto pb-2 lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-4 lg:overflow-hidden">
              {randomRecorded.map((session) => (
                <RecordedVideoCard
                  key={session.id}
                  id={session.id}
                  title={session.title}
                  videoUrl={session.videoUrl}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <Button
            size="lg"
            className="bg-primary hover:bg-ndc-darkblue"
            onClick={() => {
              navigate("/events");
            }}
          >
            View All Events
          </Button>
        </div>
      </div>
    </section>
  );
}
