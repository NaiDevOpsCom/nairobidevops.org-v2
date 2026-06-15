export interface CommunityTestimonial {
  name: string;
  title: string;
  quote: string;
  avatar?: string;
  avatarColor?: string;
}

export interface PartnerTestimonial {
  quote: string;
  author: string;
  organization?: string;
  role?: string;
}

export interface SuccessStory {
  partner: string;
  logo: string;
  quote: string;
  impact: string;
}

export const testimonialsData: {
  community: CommunityTestimonial[];
  partners: PartnerTestimonial[];
  successStories: SuccessStory[];
} = {
  community: [
    {
      name: "Karwega Njogo",
      title: "Support System Engineer",
      quote:
        "As someone deeply involved in the DevOps field, this community has proven to be an invaluable resource and a hub for collaboration!",
      avatar: "KJ",
      avatarColor: "bg-primary",
    },
    {
      name: "Anne Apiyo",
      title: "Software Developer",
      quote:
        "Nairobi DevOps Community has been instrumental in my tech journey. Engaging events, supportive network, and endless learning opportunities.",
      avatar: "AA",
      avatarColor: "bg-green-500",
    },
    {
      name: "David Ochieng",
      title: "Software Developer",
      quote:
        "From beginner to practitioner, this community provided the mentorship and resources I needed. The collaborative environment makes learning enjoyable and effective.",
      avatar: "DO",
      avatarColor: "bg-purple-500",
    },
    {
      name: "Sam Mwangi",
      title: "Software Developer",
      quote:
        "This Community has catalyzed my DevOps journey, offering invaluable support, knowledge sharing, and networking opportunities for growth, it Simplified the Complex",
      avatar: "SM",
      avatarColor: "bg-purple-500",
    },
    {
      name: "Felix Jumason",
      title: "Software Developer",
      quote:
        "Excited to be Nairobi DevOps' Campus Ambassador! Impactful learning & empowering others in DevOps at my campus!",
      avatar: "FJ",
      avatarColor: "bg-primary",
    },
  ],

  partners: [
    {
      quote:
        "The Nairobi DevOps Community has been instrumental in helping us connect with passionate tech talent. Their events are always well-organized and impactful.",
      author: "Tech Lead",
      organization: "Leading Cloud Provider",
      role: "Strategic Partner",
    },
    {
      quote:
        "Supporting this community has given us direct access to emerging DevOps professionals. It's a win-win partnership that drives real innovation.",
      author: "HR Director",
      organization: "Enterprise Software Company",
      role: "Recruitment Partner",
    },
  ],

  // Success stories / case studies from partners
  successStories: [
    {
      partner: "DEIMOS",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1753531298/12_rxpcu2.svg",
      quote:
        "Through our partnership, we've successfully onboarded top DevOps talent and contributed to shaping Kenya's cloud infrastructure landscape.",
      impact: "20+ students placed in DevOps roles",
    },
    {
      partner: "Moringa School",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1754735307/moringa_jnpf1j.svg",
      quote:
        "Collaborating with Nairobi DevOps Community has enhanced our curriculum with real-world DevOps practices.",
      impact: "500+ students trained in DevOps fundamentals",
    },
  ],
};
