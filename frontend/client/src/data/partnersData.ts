// src/data/partnersData.ts

export interface Partner {
  id: string;
  name: string;
  logo: string;
  website?: string;
}

export interface PartnersData {
  communityPartners: readonly Partner[];
  campusTour: readonly Partner[];
}

// Small helper to create safe IDs from names
const makeId = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export const partnersData: PartnersData = {
  communityPartners: [
    {
      id: makeId("DEIMOS"),
      name: "DEIMOS",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1753531298/12_rxpcu2.svg",
      website: "https://www.deimos.io/m",
    },
    {
      id: makeId("Propel"),
      name: "Propel",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1752047507/1_zgja95.svg",
      website: "https://nairobidevopscommunity.propel.community/summary",
    },
    {
      id: makeId("SolaviseTech"),
      name: "SolaviseTech",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1752047506/3_bmttu3.svg",
      website: "https://www.solavisetech.com/",
    },
    {
      id: makeId("JetBrains"),
      name: "JetBrains",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1752047505/4_fhrfcx.svg",
      website: "https://www.jetbrains.com/",
    },
    {
      id: makeId("Moringa School"),
      name: "Moringa School",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1754735307/moringa_jnpf1j.svg",
      website: "https://moringaschool.com/",
    },
    {
      id: makeId("Servercore"),
      name: "Servercore",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1752047504/6_mjhrly.svg",
      website: "https://servercore.com/",
    },
    {
      id: makeId("Angani Kenya"),
      name: "Angani Kenya",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1752047504/8_umfe7i.svg",
      website: "https://angani.co/",
    },
    {
      id: makeId("Devligence"),
      name: "Devligence",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1753531298/11_benlxm.svg",
      website: "https://devligence.com/",
    },
    {
      id: makeId("Datacamp-donates"),
      name: "Datacamp-donates",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1754735733/datacamp-donates_jvmoab.svg",
      website: "https://www.datacamp.com/",
    },
    {
      id: makeId("DevOps Days"),
      name: "DevOps Days",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1753592113/devopsdays_nespct.svg",
      website: "https://devopsdays.org/",
    },
  ],

  campusTour: [
    {
      id: makeId("Strathmore University"),
      name: "Strathmore University",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1752047932/7_qnw41y.svg",
      website: "https://strathmore.edu/",
    },
    {
      id: makeId("Kabarak University"),
      name: "Kabarak University",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1764088817/Kabarak_University_i1ninu.png",
      website: "https://www.kabarak.ac.ke/",
    },
    {
      id: makeId("KCA University"),
      name: "KCA University",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1764088801/KCAU_logo.svg_af3awk.png",
      website: "https://www.kca.ac.ke/",
    },
    {
      id: makeId("Egerton University"),
      name: "Egerton University",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1764088781/academicjobsEgertonUniversitylogo_n15kzo.webp",
      website: "https://www.egerton.ac.ke/",
    },
    {
      id: makeId("Zetech University"),
      name: "Zetech University",
      logo: "https://res.cloudinary.com/nairobidevops/image/upload/v1764088782/Zetech_University_Logo_Vert_RGB_dslv5x.png",
      website: "https://zetech.ac.ke/",
    },
  ],
} as const;
