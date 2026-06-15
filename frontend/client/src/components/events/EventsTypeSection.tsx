import { Mic, Handshake, Video, Server } from "lucide-react";
import React from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface EventType {
  icon: React.ElementType;
  title: string;
  description: string;
}

const AdsLogo = (props: React.HTMLAttributes<HTMLImageElement>) => (
  <img
    src="https://res.cloudinary.com/nairobidevops/image/upload/v1756885757/ads-logos-colors_l8bvoh.svg"
    alt="Africa DevOps Summit"
    {...props}
    className={`${props.className || ""} object-contain`}
  />
);

const eventTypes: EventType[] = [
  {
    icon: Mic,
    title: "X Space",
    description:
      "Live audio conversations with DevOps experts, thought leaders, and community members.",
  },
  {
    icon: Handshake,
    title: "In-Person Events",
    description: "Local meetups and gatherings for networking, talks, and hands-on collaboration.",
  },
  {
    icon: Video,
    title: "Virtual Events",
    description: "Interactive online sessions, demos, and Q&A accessible from anywhere.",
  },
  {
    icon: Server,
    title: "Data Center Visit",
    description: "Guided tours and workshops inside real infrastructure environments.",
  },
  {
    icon: AdsLogo,
    title: "Africa DevOps Summit",
    description:
      "Where Africa’s DevOps community comes together to connect, share, and build lasting impact.",
  },
];

export default function EventsTypeSection() {
  return (
    <section className="py-16 lg:py-24 bg-blue-50/50 dark:bg-accent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold dark:text-white mb-4">
            Types of DevOps Events
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Our community thrives across diverse formats. Whether you prefer face-to-face
            collaboration or virtual learning, there&apos;s a space for you.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {eventTypes.map((event) => (
            <Card
              key={event.title}
              className="w-full md:w-[350px] lg:w-[30%] flex flex-col items-center text-center p-6 border-2 border-blue-200 dark:border-blue-900 bg-accent dark:bg-card hover:shadow-lg transition-shadow duration-300"
            >
              <CardHeader className="flex flex-col items-center pb-2">
                <div className="mb-4 text-primary dark:text-primary">
                  <event.icon className="h-10 w-10 md:h-12 md:w-12" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold">{event.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-gray-600 dark:text-gray-300">
                  {event.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
