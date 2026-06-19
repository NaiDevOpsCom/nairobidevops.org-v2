// src/data/eventsData.ts

export type FeaturedEvent = {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image: string;
  cta: string;
  badgeColor?: string;
};

export interface UpcomingEvent {
  title: string;
  description: string;
  date: string;
  buttonText: string;
}

export const featuredEvents: FeaturedEvent[] = [
  {
    id: 1,
    title: "Kubernetes for Beginners",
    type: "Workshop",
    date: "Oct 12, 2025",
    time: "10:00 AM - 2:00 PM",
    location: "JKUAT Innovation Centre",
    description:
      "Hands-on Kubernetes workshop: pods, deployments, services and an intro to Helm. Bring a laptop.",
    image:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    cta: "Register",
    badgeColor: "bg-primary/10 text-primary",
  },
  {
    id: 2,
    title: "DevOps Career Night",
    type: "Meetup",
    date: "Nov 08, 2025",
    time: "6:00 PM - 9:00 PM",
    location: "The Alchemist, Westlands",
    description:
      "Panel talks and lightning demos from local engineers about career growth, interviewing and mentorship.",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    cta: "Join Us",
    badgeColor: "bg-green-500/10 text-green-500",
  },
];

export const upcomingEvents: UpcomingEvent[] = [
  {
    title: "Automation Night",
    description: "Online. Explore CI/CD pipelines and workflow hacks with guest engineers.",
    date: "Friday, August 1st 2025",
    buttonText: "Join Us",
  },
  {
    title: "Hands-On Workshop: Kubernetes Basics",
    description:
      "JKUAT Innovation Centre. For beginners and curious minds – bring your laptop and dive in.",
    date: "Sunday, August 10th 2025",
    buttonText: "Sign Up",
  },
  {
    title: "DevOps Social Hour",
    description:
      "The Alchemist, Westlands. Casual meetup, tech banter, and a chance to grow your network.",
    date: "Friday, August 15th 2025",
    buttonText: "RSVP",
  },
];
