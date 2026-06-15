export interface HeroSlideData {
  id: number;
  bgImage: string;
  placeholder: string;
  headlineTop: string;
  headlineMain: string;
  description: string;
  ctaPrimary: {
    text: string;
    link: string;
    icon?: "users" | "arrow-right" | "briefcase";
  };
  ctaSecondary: {
    text: string;
    link: string;
    isScroll?: boolean;
    icon?: "calendar" | "heart";
  };
}

export const heroSlidesData: HeroSlideData[] = [
  {
    id: 1,
    bgImage: "https://ik.imagekit.io/nairobidevops/ndcAssets/IMG_9872.jpg",
    placeholder: "https://ik.imagekit.io/nairobidevops/ndcAssets/IMG_9872.jpg?tr=bl-30,q-10,w-100",
    headlineTop: "Innovate . Empower . Grow",
    headlineMain: "Welcome To Nairobi DevOps Community",
    description:
      "We champion collaboration, drive innovation, and share best practices to elevate DevOps across Nairobi and beyond.",
    ctaPrimary: {
      text: "View Our Community",
      link: "/community",
      icon: "users",
    },
    ctaSecondary: {
      text: "View Our Events",
      link: "/events",
      isScroll: false,
      icon: "calendar",
    },
  },
  {
    id: 2,
    bgImage:
      "https://ik.imagekit.io/nairobidevops/ndcAssets/PXL_20240601_141651842.jpg?updatedAt=1755152981667",
    placeholder:
      "https://ik.imagekit.io/nairobidevops/ndcAssets/PXL_20240601_141651842.jpg?updatedAt=1755152981667&tr=bl-30,q-10,w-100",
    headlineTop: "Support. Equip. Represent",
    headlineMain: "Learn DevOps, Your Way",
    description:
      "Access curated courses, mentorship tracks, and hands-on labs — built for learners across Kenya. Whether you're just starting or leveling up, our LMS is here for you.",
    ctaPrimary: {
      text: "Start Learning",
      link: "/learn",
      icon: "arrow-right",
    },
    ctaSecondary: {
      text: "View Our Events",
      link: "/events",
      isScroll: false,
      icon: "calendar",
    },
  },
  {
    id: 3,
    bgImage: "https://ik.imagekit.io/nairobidevops/ndcAssets/IMG_9864.jpg",
    placeholder: "https://ik.imagekit.io/nairobidevops/ndcAssets/IMG_9864.jpg?tr=bl-30,q-10,w-100",
    headlineTop: "Learn. Build. Thrive",
    headlineMain: "Explore the Nairobi DevOps Shop",
    description:
      "Support the community and rep your mission. Find merch, digital resources, and donation bundles — all designed to fuel DevOps growth in Kenya.",
    ctaPrimary: {
      text: "Visit the Shop",
      link: "/shop",
      icon: "briefcase",
    },
    ctaSecondary: {
      text: "Support a Cause",
      link: "/donate",
      isScroll: false,
      icon: "heart",
    },
  },
];
