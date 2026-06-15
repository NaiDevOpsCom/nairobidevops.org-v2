/**
 * FAQ Data Structure
 *
 * This file contains all FAQ data organized by categories.
 * Each category contains multiple FAQ items with questions and answers.
 */

// Type definitions
export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  title: string;
  items: FAQItem[];
}

export type FAQData = FAQCategory[];

// FAQ Data organized by categories
export const faqDataByCategory: FAQData = [
  {
    title: "Community",
    items: [
      {
        question: "What is the Nairobi DevOps Community?",
        answer:
          "The Nairobi DevOps Community (NDC) is a free, inclusive, and vibrant collective of professionals passionate about DevOps, cloud, infrastructure, and open collaboration. We host meetups, workshops, and large-scale summits to empower engineers and technologists in Nairobi and across Africa.",
      },
      {
        question: "Is Nairobi DevOps a not-for-profit community?",
        answer:
          "Yes. NDC is entirely community-driven and non-profit. We exist to build, connect, and support DevOps professionals through learning, networking, and shared experiences.",
      },
      {
        question: "What is the mission of the Nairobi DevOps Community?",
        answer:
          "Our mission is to grow the adoption of DevOps practices and culture in Kenya and Africa, foster continuous learning, and connect DevOps professionals, enthusiasts, and learners.",
      },
      {
        question: "How many members are in your community?",
        answer:
          "As of now, we have 3,000+ members from across Kenya and beyond, with active participation in over 50 events held since our founding in April 2023.",
      },
      {
        question: "Is there a chapter in my city or campus?",
        answer:
          "Currently, the main activities are centered in Nairobi, but we are open to collaborations to grow city or campus chapters across Kenya. Reach out if you'd like to pioneer a chapter!",
      },
      {
        question: "Where can I learn more about NDC?",
        answer:
          "Visit our website at nairobidevops.org or follow us on Twitter, LinkedIn, and YouTube.",
      },
    ],
  },
  {
    title: "Membership",
    items: [
      {
        question: "Who can join the Nairobi DevOps Community?",
        answer:
          "Anyone interested in DevOps, SRE, cloud computing, software development, or system administration is welcome—regardless of experience level.",
      },
      {
        question: "Is membership free?",
        answer: "Yes! NDC is free to join and participate in.",
      },
      {
        question: "How do I become a member?",
        answer:
          "You can become a member by attending our events, joining our Discord server, or subscribing to our newsletter. No formal application is required.",
      },
      {
        question: "What are the benefits of being a member?",
        answer:
          "As a member, you gain access to:\n• Free workshops and meetups\n• Mentorship and learning resources\n• Networking with DevOps professionals\n• Volunteer and speaking opportunities\n• Early access to event tickets and swag",
      },
      {
        question: "How can I get involved?",
        answer:
          "You can volunteer, propose talks or workshops, help with event planning, or contribute to our online content. Reach out via email or Discord.",
      },
    ],
  },
  {
    title: "Events & Programs",
    items: [
      {
        question: "What kind of events does NDC host?",
        answer:
          "We host monthly technical meetups, themed workshops (e.g., CI/CD, IaC, Kubernetes), DevOps bootcamps, DevOpsDays Nairobi, and the annual Africa DevOps Summit.",
      },
      {
        question: "Do I need to bring a laptop?",
        answer:
          "For hands-on workshops we recommend bringing a laptop. For talks and panels, it is optional.",
      },
      {
        question: "Are your events free?",
        answer:
          "Many of our meetups are free; some workshops may require a small fee to cover materials and logistics.",
      },
      {
        question: "Can I propose a talk or workshop?",
        answer:
          "Absolutely! We welcome speakers of all experience levels. Submit your proposal via our Call for Speakers.",
      },
      {
        question: "Where can I find your event schedule?",
        answer:
          "All upcoming events are listed on our Events Page and shared across our social platforms.",
      },
      {
        question: "Can I sponsor an event?",
        answer:
          "Yes — please reach out via our partners page to discuss sponsorship and collaboration.",
      },
    ],
  },
  {
    title: "Jobs & Opportunities",
    items: [
      {
        question: "Can I post a job to the community?",
        answer:
          "Yes! We welcome job postings from companies looking for DevOps talent. Please contact us via email or submit through our Jobs Board.",
      },
      {
        question: "How can I apply for jobs posted by the community?",
        answer:
          "Visit our Jobs Board to explore open roles. Some may require applying externally through the employer's platform.",
      },
      {
        question: "Can I find freelance or remote DevOps opportunities?",
        answer:
          "Yes. We regularly share remote and freelance gigs on Discord and our newsletter. Stay subscribed and join the conversation.",
      },
    ],
  },
  {
    title: "Sponsorship & Partnership",
    items: [
      {
        question: "Can my company sponsor Nairobi DevOps?",
        answer:
          "Yes! We offer sponsorship packages for meetups, workshops, and flagship events like the Africa DevOps Summit. Visit our sponsorship page for details.",
      },
      {
        question: "Why should I sponsor NDC events?",
        answer:
          "Our events attract highly skilled professionals and emerging tech talent. Sponsors get visibility, hiring exposure, and the chance to support tech community growth.",
      },
      {
        question: "Who can I contact for partnerships or sponsorships?",
        answer: "Email us at partnerships@nairobidevops.org. We'd love to collaborate!",
      },
    ],
  },
];

/**
 * Flattened FAQ data (all FAQs in a single array)
 * Useful for components that display all FAQs without category grouping
 */
export const faqDataFlat: FAQItem[] = faqDataByCategory.flatMap((category) => category.items);

/**
 * Get all FAQ categories
 */
export const getFAQCategories = (): string[] => {
  return faqDataByCategory.map((category) => category.title);
};

/**
 * Get FAQs by category title
 */
export const getFAQsByCategory = (categoryTitle: string): FAQItem[] => {
  const category = faqDataByCategory.find((cat) => cat.title === categoryTitle);
  return category ? category.items : [];
};

/**
 * Get a specific FAQ category object
 */
export const getFAQCategory = (categoryTitle: string): FAQCategory | undefined => {
  return faqDataByCategory.find((cat) => cat.title === categoryTitle);
};
