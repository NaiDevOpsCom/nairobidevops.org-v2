export type Job = {
  id: string;
  title: string;
  company: string;
  companyLogo?: string; // optional URL or import path
  description: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  period: string; // e.g. "mo"
  tags: string[]; // tech stack tags e.g. ["kubernetes", "golang", "aws"]
  isAfricaFriendly: boolean;
  isRemote: boolean;
  postedAt: string; // e.g. "2h ago", "1d ago"
  closingIn?: string; // e.g. "2d", "today" — undefined means not urgent
  applyUrl?: string; // external application URL
  roleType: "Platform Engineering" | "SRE" | "Cloud Architect" | "Security" | "DevOps Engineer";
  locationTag:
    | "Remote (Global)"
    | "Remote (Africa Only)"
    | "Nairobi, KE"
    | "Lagos, NG"
    | "Cape Town, ZA";
};

export const jobsData: Job[] = [
  {
    id: "1",
    title: "Senior Site Reliability Engineer",
    company: "Stripe",
    description:
      "Scale global financial infrastructure using Kubernetes and Go. Work in a high-growth environment focusing on system reliability.",
    location: "Remote (EMEA)",
    salaryMin: 5000,
    salaryMax: 8500,
    currency: "$",
    period: "mo",
    tags: ["kubernetes", "golang", "aws"],
    isAfricaFriendly: true,
    isRemote: true,
    postedAt: "2h ago",
    closingIn: undefined,
    roleType: "SRE",
    locationTag: "Remote (Global)",
  },
  {
    id: "2",
    title: "Platform Engineer",
    company: "Paystack",
    description:
      "Build the payment infrastructure for Africa. Maintain and automate cloud resources across multi-region clusters.",
    location: "Lagos, NG / Remote",
    salaryMin: 3000,
    salaryMax: 5500,
    currency: "$",
    period: "mo",
    tags: ["terraform", "gcp"],
    isAfricaFriendly: false,
    isRemote: true,
    postedAt: "1d ago",
    closingIn: "2d",
    roleType: "Platform Engineering",
    locationTag: "Lagos, NG",
  },
  {
    id: "3",
    title: "DevOps Consultant",
    company: "Andela",
    description:
      "Consult with global partners on DevOps best practices and CI/CD implementation for modern cloud-native apps.",
    location: "Remote (Africa)",
    salaryMin: 4000,
    salaryMax: 6500,
    currency: "$",
    period: "mo",
    tags: ["azure", "ci/cd"],
    isAfricaFriendly: false,
    isRemote: true,
    postedAt: "3h ago",
    closingIn: "today",
    roleType: "DevOps Engineer",
    locationTag: "Remote (Africa Only)",
  },
  {
    id: "4",
    title: "Cloud Architect",
    company: "Flutterwave",
    description:
      "Design and oversee cloud architecture for one of Africa's leading fintech platforms. Drive infrastructure strategy across AWS and GCP.",
    location: "Nairobi, KE / Remote",
    salaryMin: 6000,
    salaryMax: 9500,
    currency: "$",
    period: "mo",
    tags: ["aws", "gcp", "terraform", "kubernetes"],
    isAfricaFriendly: true,
    isRemote: true,
    postedAt: "5h ago",
    closingIn: undefined,
    roleType: "Cloud Architect",
    locationTag: "Nairobi, KE",
  },
  {
    id: "5",
    title: "Security Engineer",
    company: "Chipper Cash",
    description:
      "Protect cross-border payment systems and customer data. Lead penetration testing and security audits across the platform.",
    location: "Remote (Africa Only)",
    salaryMin: 4500,
    salaryMax: 7000,
    currency: "$",
    period: "mo",
    tags: ["security", "aws", "compliance"],
    isAfricaFriendly: true,
    isRemote: true,
    postedAt: "12h ago",
    closingIn: "3d",
    roleType: "Security",
    locationTag: "Remote (Africa Only)",
  },
  {
    id: "6",
    title: "Senior Platform Engineer",
    company: "Kobo360",
    description:
      "Scale logistics infrastructure across African markets. Own the platform reliability and deployment pipelines for a high-growth startup.",
    location: "Lagos, NG",
    salaryMin: 3500,
    salaryMax: 5000,
    currency: "$",
    period: "mo",
    tags: ["docker", "ci/cd", "gcp"],
    isAfricaFriendly: false,
    isRemote: false,
    postedAt: "2d ago",
    closingIn: undefined,
    roleType: "Platform Engineering",
    locationTag: "Lagos, NG",
  },
];

export const totalJobs = 142;
export const closingThisWeek = 38;
export const lastUpdated = "2 hours ago";
