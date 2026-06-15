// NDC (Nairobi DevOps Community) Data
// This file contains all the data for the About Us page and other NDC-related content

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  image: string;
  socials?: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    website?: string;
    email?: string;
    phone?: string;
  };
  bio?: string;
  career?: string;
}

export interface Statistic {
  id: string;
  number: string;
  label: string;
  icon?: string;
}

// Statistics Data
export const statisticsData: Statistic[] = [
  {
    id: "community-members",
    number: "4000+",
    label: "Community Members",
    icon: "Users",
  },
  {
    id: "developers-trained",
    number: "300+",
    label: "Developers Trained",
    icon: "GraduationCap",
  },
  {
    id: "trainers",
    number: "20+",
    label: "Trainers",
    icon: "Award",
  },
  {
    id: "events",
    number: "70+",
    label: "Events",
    icon: "Calendar",
  },
  {
    id: "partners",
    number: "25+",
    label: "Partners",
    icon: "Handshake",
  },
  {
    id: "students-reached",
    number: "2000+",
    label: "Students Reached",
    icon: "GraduationCap",
  },
  {
    id: "scholarship-awarded",
    number: "60+",
    label: "Scholarship Awarded",
    icon: "GraduationCap",
  },
];

// Team Data
export const teamData: TeamMember[] = [
  {
    id: "maamun-bwanakombo",
    name: "Maamun Bwanakombo",
    title: "Director",
    image:
      "https://res.cloudinary.com/nairobidevops/image/upload/v1754543466/Maamun_Profile_Photo000_-_Maamun_Bwanakombo_npfvyl.png",
    socials: {
      linkedin: "https://linkedin.com/in/maamun-bwanakombo-58849b141",
      twitter: "https://x.com/maamunb1",
    },
    bio: "Passionate DevOps leader with extensive experience in building communities and driving technological innovation in East Africa.",
  },
  {
    id: "kevin-tuei",
    name: "Kevin Tuei",
    title: "Assistant Director",
    image:
      "https://res.cloudinary.com/nairobidevops/image/upload/v1751295296/IMG_20231219_222811_913_-_Kevin_Tuei_l49t4o.jpg",
    socials: {
      linkedin: "https://linkedin.com/in/kevintuei",
      twitter: "https://x.com/kevshakes",
      instagram: "https://instagram.com/kevshakes",
      website: "https://kevintuei.medium.com",
    },
    bio: "My mission is to make the world a better place through technology. How? By training 100,000+ people on Cloud, AI/ML and Cybersecurity and leading 500+ projects in IT for Quality Education and Inclusion through Tech Communities and Mentorship.",
    career: "Cybersecurity & AI/ML Consultant",
  },
  {
    id: "alvin-ndungu",
    name: "Alvin Ndungu",
    title: "Projects Lead",
    image:
      "https://res.cloudinary.com/nairobidevops/image/upload/v1754543466/Screenshot_20250724_192455_Gallery_-_Alvin_Ndungu_kqemak.jpg",
    socials: {
      linkedin: "https://linkedin.com/in/alvin-ndungu",
      twitter: "https://x.com/alvin_kh",
    },
    bio: "Project management expert focused on delivering impactful DevOps initiatives and community-driven solutions.",
  },
  {
    id: "ronald-kipchirchir",
    name: "Ronald Kipchirchir",
    title: "Events Coordinator",
    image:
      "https://res.cloudinary.com/nairobidevops/image/upload/v1754543466/profile_-_Ronald_Kipchirchir_nj0zo2.jpg",
    socials: {
      linkedin: "https://linkedin.com/in/ronald-kipchirchir-034983246/",
      twitter: "https://x.com/Ronaah_254",
    },
    bio: "Events Coordinator at the Nairobi DevOps Community, focused on building strong, inclusive spaces where people learn, connect, and grow together. I lead the planning and delivery of community-driven initiatives such as campus tours, meetups, summits and online events that connect students, professionals, and industry partners. I come from a community of marathon runners—but instead of running races, I chose to run code and tech events! This background shapes my leadership style: consistent, collaborative, and purpose-driven. My work centers on empowering emerging talent, strengthening partnerships, and creating programs that turn curiosity into capability and community into impact.",
  },
  {
    id: "moses-mbadi",
    name: "Moses Mbadi",
    title: "Mentor",
    image:
      "https://res.cloudinary.com/nairobidevops/image/upload/v1762225694/IMG_3815_-_Moses_Mbadi_nd5izk.jpg",
    socials: {
      linkedin: "https://www.linkedin.com/in/moses-mbadi-0b8500198/",
      twitter: "https://twitter.com/mosesmbadi",
    },
    bio: "Hi, I’m Mbadi! As a Community Lead and Mentor, my mission is simple: to help developers find their aha! moment. I believe that tech is better when we build it together, and I spend my time creating spaces where everyone—from students to senior leads—feels supported and heard. Whether I’m hosting a workshop or sitting down for a 1:1 mentorship session, I’m always looking for ways to turn individual growth into community success. Let's build something great together!",
    career: "Head of IT @ Chem-Labs Ltd, Founder @ Soma Stories",
  },
  {
    id: "tabitha-margaret-wangechi",
    name: "Tabitha Margaret Wangechi",
    title: "Graphic Designer/Community Manager",
    image:
      "https://res.cloudinary.com/nairobidevops/image/upload/v1751329261/headshot_-_Tabitha_Wangechi_fuuwbv.jpg",
    socials: {
      linkedin: "https://linkedin.com/in/tabitha-margaret771/",
      twitter: "https://x.com/_mWangechi",
    },
    bio: "She's a passionate Graphic designer and UI/UX designer, whose main role in the community is to create visual assets that support the community events, programs and outreaches. She is responsible for creating the digital and print media working closely with the other community managers to achieve the brand's mission. She aims at creating a consistent and impactful visual identity of the community in the DevOps ecosystem in Nairobi.",
    career: "Student @ JKUAT",
  },
  {
    id: "reyhana-cherop",
    name: "Reyhana Cherop",
    title: "Campus Tour Lead",
    image:
      "https://res.cloudinary.com/nairobidevops/image/upload/v1754543466/20230820_101641_-_Reyhana_Cherop_nxgjnp.jpg",
    socials: {
      linkedin: "https://linkedin.com/in/reyhana-cherop-77a584156/",
      twitter: "https://x.com/reyhana_cherop",
    },
  },
  {
    id: "lawrence-juma",
    name: "Lawrence Juma",
    title: "Program Manager/Communication Lead",
    image:
      "https://res.cloudinary.com/nairobidevops/image/upload/v1751336808/IMG_3190_-_Lawrence_Juma_rrelx4.jpg",
    socials: {
      linkedin: "https://linkedin.com/in/jumalaw98",
      twitter: "https://x.com/jumalaw98",
      instagram: "https://instagram.com/jumalaw98",
    },
  },
  {
    id: "mercy-nduta-kabingu",
    name: "Mercy Nduta Kabingu",
    title: "UI/UX Designer",
    image:
      "https://res.cloudinary.com/nairobidevops/image/upload/v1766460387/mercy_kabingu_-_kabingu_d0ijqn.jpg",
    socials: {
      twitter: "https://x.com/Ndutakabingu",
      website: "https://dev-kabingu-portfolio.vercel.app/",
    },
    bio: "UI/UX designer focused on crafting intuitive interfaces and committed to turning complex ideas into simple, usable experiences",
    career: "UI/UX designer @Techleap-zynamis",
  },
  {
    id: "anita-kahenya",
    name: "Anita Kahenya",
    title: "Lead events",
    image:
      "https://res.cloudinary.com/nairobidevops/image/upload/v1751513207/IMG_2484_-_Anita_Kahenya_pmocp9.jpg",
    socials: {
      twitter: "https://x.com/KahenyaAnita",
      linkedin: "https://www.linkedin.com/in/anita-kahenya/",
    },
    bio: "I am the Events Lead at the Nairobi DevOps Community, where I help design, plan, and execute events that bring together practitioners, learners, and industry leaders across the DevOps ecosystem. My focus is on creating meaningful, well-structured experiences that encourage knowledge sharing, collaboration, and real-world problem solving. With a background in software quality engineering, cloud systems monitoring, and developer enablement, I’m passionate about building bridges between technical excellence and community impact. I care deeply about making DevOps accessible, practical, and inclusive especially for early-career engineers and underrepresented voices in tech. Through my work, I focus on community-driven events, speaker curation, mentorship opportunities, and initiatives that strengthen learning, visibility, and growth within the Nairobi tech ecosystem.",
    career: "QA Engineer- Jacaranda health",
  },
  {
    id: "ian-kiprotich",
    name: "Ian Kiprotich",
    title: "Finance and Planning manager",
    image:
      "https://res.cloudinary.com/nairobidevops/image/upload/v1767729547/PXL_20250819_104000826_2_-_Ian_Kiprotich_nbkrgu.jpg",
    socials: {
      twitter: "https://x.com/Onai_erd",
      linkedin: "https://www.linkedin.com/in/iankiprotich",
    },
    bio: "I am passionate about open-source technologies, cloud-native adoption, and community building through mentorship, events, and knowledge sharing. My current focus is on Kubernetes platform engineering, GitOps, security, and observability, while helping teams adopt modern, scalable DevOps practices.",
    career: "DevOps engineer @ Safaricom",
  },
];
