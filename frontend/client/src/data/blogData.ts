export type Author = {
  name: string;
  avatar: string; // url
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string; // ISO string
  author: Author;
  cover: { url: string; alt: string; width: number; height: number };
  readingTimeMin?: number;
  content: Array<{ type: "p" | "h2" | "ul"; text?: string; items?: string[] }>;
  featured?: boolean;
};

// High-quality Unsplash images with descriptive alt text
const authorMercy: Author = {
  name: "Mercy Kabingu",
  avatar:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&auto=format&q=60",
};

export const blogPosts: BlogPost[] = [
  {
    id: "ux-data-driven-design",
    slug: "quant-ux-the-future-of-data-driven-design",
    title: "Quant UX: The Future of Data‑Driven Design",
    excerpt:
      "How UX uses analytics and testing to shape smarter, user‑focused digital experiences.",
    category: "DevOps",
    date: new Date().toISOString(),
    author: authorMercy,
    cover: {
      url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1400&q=70",
      alt: "Speaker presenting innovation and growth ideas at a tech meetup",
      width: 1400,
      height: 900,
    },
    readingTimeMin: 6,
    featured: true,
    content: [
      { type: "p", text: "Design decisions are increasingly informed by real user behavior." },
      {
        type: "p",
        text: "By pairing qualitative research with product analytics, teams uncover friction points and ship improvements faster.",
      },
      { type: "h2", text: "What changes in 2025" },
      {
        type: "ul",
        items: [
          "Experimentation becomes continuous",
          "UX metrics tie to business outcomes",
          "Privacy‑first telemetry",
        ],
      },
    ],
  },
  // Repeated cards echoing the design grid
  ...Array.from({ length: 8 }).map((_, i) => ({
    id: `devops-platform-${i + 1}`,
    slug: `the-future-of-devops-platform-engineering-in-2025-${i + 1}`,
    title: "The Future of DevOps: Platform Engineering in 2025",
    excerpt:
      "Explore how Platform Engineering is evolving DevOps, creating developer‑centric platforms for scalability and reliability.",
    category: "DevOps",
    date: new Date().toISOString(),
    author: authorMercy,
    cover: {
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=70",
      alt: "Engineer giving a talk holding a microphone in front of whiteboard",
      width: 800,
      height: 600,
    },
    readingTimeMin: 5,
    content: [
      {
        type: "p",
        text: "Platform Engineering streamlines delivery by providing paved roads, golden paths, and strong internal tooling.",
      },
      { type: "p", text: "This article surveys emerging patterns and pitfalls for 2025." },
    ] as Array<{ type: "p" | "h2" | "ul"; text?: string; items?: string[] }>,
  })),
];

export const featuredPost = blogPosts.find((p) => p.featured) ?? blogPosts[0];

export type BlogData = {
  featured: BlogPost;
  posts: BlogPost[];
};

export const blogData: BlogData = {
  featured: featuredPost,
  posts: blogPosts,
};
