// src/data/communityPageData.ts

export interface CommunityEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
}

export interface CommunityProject {
  id: number;
  title: string;
  description: string;
  image: string;
  date: string; // Displayed next to the title on the project card
}

export const events: CommunityEvent[] = [
  {
    id: 1,
    title: "DevOps Fundamentals Training",
    date: "15 Jan 2024",
    time: "10:00 AM - 12:00 PM",
    location: "Online",
    image: "https://pbs.twimg.com/media/F6xKLnPX0AADDlt?format=jpg&name=4096x4096",
  },
  {
    id: 2,
    title: "CI/CD Workshop",
    date: "22 Jan 2024",
    time: "2:00 PM - 4:00 PM",
    location: "Nairobi Tech Hub",
    image: "https://pbs.twimg.com/media/F6r8agmXAAAwS48?format=jpg&name=large",
  },
];

// Community projects displayed on the Community page.
export const projects: CommunityProject[] = [
  {
    id: 1,
    title: "Nairobi DevOps Website Redesign",
    description:
      "A community‑led initiative to improve storytelling, accessibility, and engagement.",
    image:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1600&auto=format&fit=crop",
    date: "Oct 2024",
  },
  {
    id: 2,
    title: "Africa DevOps Summit Website Redesign",
    description:
      "An open‑source guide to CI/CD, cloud setup, and monitoring for early‑stage teams.",
    image:
      "https://images.unsplash.com/photo-1554941829-202a0b2403b1?q=80&w=1600&auto=format&fit=crop",
    date: "Nov 2024",
  },
  {
    id: 3,
    title: "Inclusive Tech Glossary",
    description: "A living document defining key DevOps terms in simple, inclusive language.",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop",
    date: "Dec 2024",
  },
  {
    id: 4,
    title: "Nairobi DevOps Website Redesign",
    description:
      "A community‑led initiative to improve storytelling, accessibility, and engagement.",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop",
    date: "Jan 2025",
  },
  {
    id: 5,
    title: "Africa DevOps Summit Website Redesign",
    description:
      "An open‑source guide to CI/CD, cloud setup, and monitoring for early‑stage teams.",
    image:
      "https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=1600&auto=format&fit=crop",
    date: "Feb 2025",
  },
  {
    id: 6,
    title: "Inclusive Tech Glossary",
    description: "A living document defining key DevOps terms in simple, inclusive language.",
    image:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop",
    date: "Mar 2025",
  },
];

export interface RecordedSession {
  id: number;
  title: string;
  videoUrl: string; // URL to the video (e.g., YouTube)
}

export const recordedSessions: RecordedSession[] = [
  {
    id: 1,
    title: "DevOps Career Talk by Brian Ndeva",
    videoUrl: "https://www.youtube.com/watch?v=UH5_VIztWDc",
  },
  {
    id: 2,
    title: "Service Mesh(Introduction To Istio) by Gidraff Kamande",
    videoUrl: "https://www.youtube.com/watch?v=g8hNmDNJqUI",
  },
  {
    id: 3,
    title: "CI/CD with Jenkins by Jennifer Kibiri",
    videoUrl: "https://www.youtube.com/watch?v=9fMFhWyZQ1E",
  },
  {
    id: 4,
    title: "Multi Tenancy In Kubernetes Using Virtual Clusters By Ian Kiprotich",
    videoUrl: "https://www.youtube.com/watch?v=C7fk-tJngmI",
  },
  {
    id: 5,
    title: "Puppet As A DevOps Tool by Maamun Bwanakombo",
    videoUrl: "https://www.youtube.com/watch?v=xlxFr4oKyNg",
  },
  {
    id: 6,
    title: "How To Migrate From AWS To SERVERCORE(Step by step) By SERVERCORE CTO - Ivan Romanko",
    videoUrl: "https://www.youtube.com/watch?v=BjOYoU7QtT8",
  },
  {
    id: 7,
    title: "Dockerizing a Django App on GKE by Amdava Collins",
    videoUrl: "https://www.youtube.com/watch?v=APPfvvgd0WM",
  },
  {
    id: 8,
    title: "Automating Jenkins Configurations The IAC Way by Gerrard Ezeugwa",
    videoUrl: "https://www.youtube.com/watch?v=bdpWM1MdA9s",
  },
];
