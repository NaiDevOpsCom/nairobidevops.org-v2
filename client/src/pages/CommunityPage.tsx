import {
  ClipboardList,
  FlaskConical,
  Users,
  Wrench,
  Check,
  Handshake,
  Cloud,
  Briefcase,
  Terminal,
  Compass,
  GraduationCap,
  Bell,
  Youtube,
} from "lucide-react";
import React, { useMemo } from "react";
import { Link } from "wouter";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import RecordedVideoCard from "@/components/RecordedVideoCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { NdcCampusLogos } from "@/components/ui/ndcCampusLogos";
import {
  events,
  projects,
  recordedSessions,
  CommunityEvent,
  CommunityProject,
} from "@/data/communityPageData";
import { communityGallery } from "@/data/galleryData";
import { allData } from "@/data/whatWeDoData";
import { getRandomItems } from "@/utils/getRandomItems";
import { getWeightedRandomItem } from "@/utils/weightedRandom";

// --- Component for "What We Offer" items ---
interface OfferItemProps {
  title: string;
  iconBg?: string;
  variant?: "labs" | "coaching" | "tools";
}

const registrationSteps = [
  { number: 1, label: "Explore\nCourses" },
  { number: 2, label: "Select\nCourses" },
  { number: 3, label: "Fill in your\ndetails" },
  { number: 4, label: "Confirm\nRegistration" },
];

function RegistrationProgress() {
  return (
    <div className="flex items-center justify-center w-full max-w-4xl mx-auto px-4">
      {registrationSteps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          {/* Step Circle and Label */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0066CC] flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-lg">
              {step.number}
            </div>
            <p className="mt-3 text-xs md:text-sm text-center font-medium text-foreground whitespace-pre-line leading-tight">
              {step.label}
            </p>
          </div>

          {/* Connector Line */}
          {index < registrationSteps.length - 1 && (
            <div className="w-12 md:w-20 lg:w-28 h-1 bg-[#0066CC] mx-1 md:mx-2 -mt-6" />
          )}
        </div>
      ))}

      {/* Final connector to Done */}
      <div className="w-12 md:w-20 lg:w-28 h-1 bg-[#B8D4E8] mx-1 md:mx-2 -mt-6" />

      {/* Done Circle with Checkmark */}
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#D6E8F5] flex items-center justify-center shadow-lg">
          <Check className="w-6 h-6 md:w-7 md:h-7 text-[#0066CC] stroke-[3]" />
        </div>
        <p className="mt-3 text-xs md:text-sm text-center font-medium text-foreground">Done</p>
      </div>
    </div>
  );
}

const OfferItem: React.FC<OfferItemProps> = ({ title, iconBg = "bg-white", variant }) => {
  const baseIconClass = "h-6 w-6 text-primary";
  let IconEl: React.ReactNode = <ClipboardList className={baseIconClass} aria-hidden />;
  if (variant === "labs") IconEl = <FlaskConical className={baseIconClass} aria-hidden />;
  if (variant === "coaching") IconEl = <Users className={baseIconClass} aria-hidden />;
  if (variant === "tools") IconEl = <Wrench className={baseIconClass} aria-hidden />;

  return (
    <li className="flex items-center gap-4">
      <span
        className={`inline-flex items-center justify-center h-12 w-12 rounded-lg shadow ${iconBg}`}
      >
        {IconEl}
      </span>
      <span className="text-lg font-medium text-slate-800 dark:text-white">{title}</span>
    </li>
  );
};

// --- Component for "Delivery Formats" items ---
interface DeliveryItemProps {
  index: number;
  text: string;
}

const DeliveryItem: React.FC<DeliveryItemProps> = ({ index, text }) => (
  <li className="flex items-center gap-4">
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-blue-600 text-white font-bold">
      {String(index).padStart(2, "0")}
    </span>
    <span className="text-base md:text-lg text-slate-800">{text}</span>
  </li>
);

// --- Hero Gallery Component ---
function HeroGallery() {
  // Select a single random background from communityGallery (weighted by priority)
  const { url: fullUrl, alt } = useMemo(() => {
    const picked = getWeightedRandomItem(communityGallery, (img) => (img.priority ? 2 : 1));
    if (!picked) return { url: "", alt: "Community image" };
    return { url: picked.url, alt: picked.alt || "Community image" };
  }, []);

  const bgUrl = fullUrl || "";

  return (
    <section
      className="relative text-white"
      style={{
        backgroundImage: `linear-gradient(rgba(2,6,23,0.45), rgba(2,6,23,0.45)), url('${bgUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label={alt}
    >
      <div className="min-h-[50vh] md:min-h-[60vh] lg:min-h-[70vh] flex items-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Building DevOps Future, <span className="text-primary">Together</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed max-w-3xl mx-auto">
            Join a vibrant community of developers, designers, engineers, and innovators shaping the
            future of technology through collaboration, learning, and impact.
          </p>
        </div>
      </div>
    </section>
  );
}

// --- What Defines Us Section Component ---
const WhatDefinesUsSection: React.FC = () => (
  <section className="py-16 md:py-20 lg:py-24 bg-primary-light-blue dark:bg-neutral-900">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-black mb-4 dark:text-white">
          What Defines Us
        </h2>
        <div className="w-20 h-1 bg-primary mx-auto rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {allData.whatDefinesUs.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="group bg-white p-6 md:p-8 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col items-center text-center"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-lg bg-white shadow-md group-hover:shadow-lg group-hover:bg-primary/5 transition-all duration-300 mb-6">
                <Icon className="h-7 w-7 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-3">{item.title}</h3>
              <p className="text-gray-600 leading-relaxed">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// --- Empowering Community Section Component ---
const EmpoweringCommunitySection: React.FC = () => (
  <section
    id="empowering-community"
    className="py-12 sm:py-16 lg:py-20 xl:py-24 bg-[#C2C2C2] dark:bg-[#000000]"
    aria-labelledby="empowering-heading"
  >
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-start">
        {/* Left: Image + Title, Copy, Stats + CTA */}
        <div className="space-y-6 sm:space-y-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group">
            <img
              src="https://res.cloudinary.com/nairobidevops/image/upload/v1754543466/Maamun_Profile_Photo000_-_Maamun_Bwanakombo_npfvyl.png"
              alt="Smiling community leader standing in front of tiled wall"
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="space-y-4">
            <h2
              id="empowering-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-black dark:text-white"
            >
              Empowering the Nairobi DevOps Community
            </h2>
            <p className="text-base sm:text-lg text-black dark:text-slate-300 max-w-2xl">
              Maamun Bwanakombo&apos;s vision and leadership continue to shape a thriving, inclusive
              tech ecosystem across Kenya and beyond.
            </p>
          </div>

          <div className="pt-2">
            <Button
              size="lg"
              className="flex items-center text-lg px-8 py-4 hover:bg-ndc-darkblue transition-colors duration-200"
              asChild
            >
              <a href="https://linktr.ee/nairobidevops" target="_blank" rel="noopener noreferrer">
                <Users className="mr-2 h-5 w-5" />
                Join Our Community
              </a>
            </Button>
          </div>
        </div>

        {/* Right: Content blocks + Quote */}
        <div className="space-y-6 sm:space-y-8 lg:pt-4">
          <div className="space-y-6 sm:space-y-8">
            {[
              {
                title: "Championing DevOps Excellence",
                content:
                  "Maamun has led workshops, curated technical content, and introduced best practices in automation, CI/CD, and infrastructure as code. His expertise in Terraform, Jenkins, and Docker has empowered hundreds of engineers.",
              },
              {
                title: "Building Inclusive Spaces",
                content:
                  "Through mentorship and outreach, Maamun has grown the community to over 3,000 members, ensuring representation from students, startups, and professionals.",
              },
              {
                title: "Leading Conversations",
                content:
                  "As a lead organizer of DevOpsDays Nairobi, Maamun has created platforms for dialogue and innovation through meetups, Twitter Spaces, and panels.",
              },
              {
                title: "A Legacy of Impact",
                content:
                  "Maamun's work fosters a culture of empathy, shared success, and continuous improvement—where DevOps is more than a methodology, it's a mindset.",
              },
            ].map((item, index) => (
              <div key={index} className="group">
                <div className="flex items-start gap-4">
                  <div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-black dark:text-slate-100">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-black dark:text-slate-300 leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <dl
            className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6"
            aria-label="Community impact statistics"
          >
            <div className="bg-slate-50 dark:bg-black/50 p-4 rounded-lg">
              <dt className="sr-only">Members reached</dt>
              <dd>
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary dark:text-sky-400 block">
                  3000+
                </span>
                <span className="text-xs sm:text-sm mt-1 text-black dark:text-slate-400 block">
                  members reached
                </span>
              </dd>
            </div>
            <div className="bg-slate-50 dark:bg-black/50 p-4 rounded-lg">
              <dt className="sr-only">Workshops hosted</dt>
              <dd>
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary dark:text-sky-400 block">
                  50+
                </span>
                <span className="text-xs sm:text-sm mt-1 text-black dark:text-slate-400 block">
                  workshops hosted
                </span>
              </dd>
            </div>
            <div className="bg-slate-50 dark:bg-black/50 p-4 rounded-lg">
              <dt className="sr-only">Campuses engaged</dt>
              <dd>
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary dark:text-sky-400 block">
                  10+
                </span>
                <span className="text-xs sm:text-sm mt-1 text-black dark:text-slate-400 block">
                  campuses engaged
                </span>
              </dd>
            </div>
          </dl>

          {/* Quote card */}
          <figure className="rounded-2xl bg-black text-white p-6 sm:p-8 shadow-xl transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 dark:bg-[#000000]">
            <blockquote className="text-lg sm:text-xl leading-relaxed">
              &ldquo;DevOps is about people first. Tools come second.&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-slate-300 font-medium">— Maamun Bwanakombo</figcaption>
          </figure>
        </div>
      </div>
    </div>
  </section>
);

// --- Campus Tour Section Component ---
const CampusTourSection: React.FC = () => (
  <section
    id="campustour"
    className="py-16 md:py-24 bg-white text-black dark:bg-ndc-darkblue dark:text-white"
  >
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="text-center max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-black dark:text-white">
          Nairobi DevOps Community Campus Tour
        </h2>
        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-black dark:text-white mb-8 leading-tight">
          Bringing Real-World DevOps to Kenya&apos;s Universities
        </h3>
        <p className="text-lg text-black dark:text-white max-w-4xl mx-auto leading-relaxed">
          The Campus Tour is our nationwide outreach initiative designed to equip students with
          practical DevOps and cloud computing skills—right on their campuses. We partner with
          leading tech groups to deliver hands-on sessions, expert talks, and career guidance that
          bridge the gap between classroom theory and industry demands
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 max-w-6xl mx-auto items-start">
        {/* Why Invite Us */}
        <div>
          <h4 className="text-2xl font-bold text-black dark:text-white mb-8">Why Invite Us</h4>
          <div className="space-y-6">
            {[
              {
                text: "Access to real-world DevOps and cloud experts",
                icon: Cloud,
              },
              {
                text: "Learn in-demand skills for internships and jobs",
                icon: Briefcase,
              },
              {
                text: "Hands-on demos and guided activities",
                icon: Terminal,
              },
              {
                text: "Discover career paths in DevOps, SRE, and Cloud Engineering",
                icon: Compass,
              },
              {
                text: "All sessions are free and tailored to your university's needs",
                icon: GraduationCap,
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                  </div>
                  <p className="text-lg text-black leading-relaxed dark:text-white pt-1.5">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-[#DDEBF7] rounded-lg p-8 md:p-10">
          <h4 className="text-2xl font-bold text-black mb-6">How It Works</h4>
          <div className="space-y-6">
            <p className="text-lg text-black font-medium leading-relaxed">
              We visit universities across Kenya, delivering interactive sessions on different
              areas.
            </p>
            <p className="text-lg text-black font-medium leading-relaxed">
              Each stop includes expert speakers, live demos, and networking opportunities with
              industry professionals.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-16 text-center">
        <NdcCampusLogos />
      </div>

      <div className="mt-12 text-center">
        <Button
          size="lg"
          className="bg-primary hover:bg-sky-700 text-white font-medium py-6 px-10 text-lg transition-all duration-200 shadow-md hover:shadow-lg"
        >
          Propose Your Campus
        </Button>
      </div>
    </div>
  </section>
);

// --- DevOps Culture Section Component ---
const DevOpsCultureSection: React.FC = () => (
  <section className="py-20 bg-primary-light-blue dark:bg-black dark:text-white">
    <div className="container mx-auto px-4">
      {/* Heading + Subheading */}
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-black dark:text-white">
          DevOps Culture for High-Impact Teams
        </h2>
        <p className="mt-4 text-xl md:text-2xl font-semibold text-black/80 dark:text-white">
          Empowering Teams to Build, Ship, and Scale with Confidence
        </p>
        <p className="mt-8 text-base md:text-lg text-black/80 dark:text-white">
          At Nairobi DevOps Community, we believe that DevOps is more than just tools—it&apos;s a
          culture of collaboration, automation, and continuous improvement. Our corporate training
          programs are designed to help organizations transform their development and operations
          workflows, foster innovation, and accelerate delivery.
        </p>
      </div>

      {/* Content */}
      <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start max-w-6xl mx-auto">
        {/* Left: What We Offer */}
        <div>
          <h3 className="text-2xl font-bold text-black dark:text-white">What We Offer</h3>
          <ul className="mt-8 space-y-8 dark:text-white">
            <OfferItem iconBg="bg-white" title="Customized Workshops" />
            <OfferItem iconBg="bg-white" title="Hands-On Labs" variant="labs" />
            <OfferItem iconBg="bg-white" title="DevOps Culture Coaching" variant="coaching" />
            <OfferItem iconBg="bg-white" title="Toolchain Mastery" variant="tools" />
          </ul>
        </div>

        {/* Right: Delivery Formats card */}
        <div className="bg-white/80 backdrop-blur rounded-xl shadow-md p-8 border border-slate-200">
          <h3 className="text-2xl font-bold text-black">Delivery Formats</h3>
          <ul className="mt-8 space-y-6">
            <DeliveryItem index={1} text="On-site or virtual sessions" />
            <DeliveryItem index={2} text="Half-day, full-day, or multi-week format" />
            <DeliveryItem index={3} text="Certification prep and post-training support" />
          </ul>
        </div>
      </div>
    </div>
  </section>
);

// --- DevOps Courses Section Component ---
const DevOpsCoursesSection: React.FC = () => (
  <section className="py-16 bg-white dark:bg-neutral-900">
    <div className="container mx-auto px-4">
      {/* Section intro */}
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          DevOps Courses
        </h2>
        <p className="mt-4 text-sm md:text-base text-neutral-600 dark:text-neutral-300">
          Whether you’re just starting out or scaling your DevOps expertise, our curated
          courses—delivered in partnership with leading trainers—equip you with the skills to thrive
          in today’s tech landscape.
        </p>
      </div>

      {/* Upskill subheading */}
      <div className="mt-12 max-w-3xl mx-auto text-center mb-6">
        <h3 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-white">
          Ready to Upskill?
        </h3>
        <p className="mt-2 text-sm md:text-base text-neutral-600 dark:text-neutral-300">
          Our registration process is quick and simple. Follow the steps below to enroll in your
          preferred course.
        </p>
        <p className="mt-2 text-xs md:text-sm text-neutral-600 dark:text-neutral-300">
          You’ll be done in just a few minutes — no guesswork, no confusion.
        </p>
      </div>

      <RegistrationProgress />

      {/* Available Courses */}
      <div className="container mx-auto px-4 mt-6">
        <h2 className="text-3xl font-bold text-center mb-12">Available Courses</h2>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {events.length > 0 ? (
            events.map((event: CommunityEvent) => (
              <Card key={event.id} className="overflow-hidden">
                <div className="h-48 bg-gray-200">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <CardHeader>
                  <CardTitle>{event.title}</CardTitle>
                  <div className="space-y-2 mt-2">
                    <p className="text-sm text-gray-600">
                      📅 {event.date} • 🕒 {event.time}
                    </p>
                    <p className="text-sm text-gray-600">📍 {event.location}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Register Now</Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center text-center py-12 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="bg-sky-100 dark:bg-sky-900/30 p-4 rounded-full mb-6 relative">
                <Bell className="w-10 h-10 text-sky-600 dark:text-sky-400" />
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900"></span>
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                No upcoming courses right now
              </h3>

              <p className="text-gray-600 dark:text-gray-300 max-w-lg mb-8 leading-relaxed">
                We&apos;re currently planning our next batch of DevOps courses and workshops.
                Subscribe to our newsletter to get notified as soon as registration opens!
              </p>

              <Button
                onClick={() => {
                  const element = document.getElementById("newsletter");
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="bg-primary hover:bg-sky-700 text-white font-medium px-8 py-2.5 rounded-lg flex items-center gap-2 group transition-all duration-200"
              >
                <span>Get Notified</span>
                <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  </section>
);

// --- Events & Meetups Section Component ---
const EventsMeetupsSection: React.FC = () => {
  const randomRecorded = React.useMemo(() => getRandomItems(recordedSessions, 4), []);

  return (
    <section className="py-16 bg-ndc-darkblue">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl text-primary font-bold mb-4">Events & Meetups</h2>
          <p className="mt-4 text-xl md:text-2xl font-semibold text-white mb-6 leading-tight">
            Workshops, Talks & Real-World Collaboration
          </p>
          <p className="text-white max-w-2xl mx-auto mb-10">
            We host a variety of events catering to all skill levels. From deep-dive technical
            workshops and continuous learning series to casual meetups and industry expert panels.
            Our sessions are designed to be hands-on, bringing you practical knowledge you can apply
            immediately.
          </p>

          <h3 className="text-3xl text-primary font-bold mb-6 mt-16">Previous Recorded Sessions</h3>
          <p className="text-gray-300 mb-8">
            Catch up on what you missed! Explore our library of past event recordings.
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-flow-col auto-cols-[min(80%,_320px)] gap-6 overflow-x-auto pb-2 lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-4 lg:overflow-hidden">
            {randomRecorded.map((session) => (
              <RecordedVideoCard
                key={session.id}
                id={session.id}
                title={session.title}
                videoUrl={session.videoUrl}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-sky-500 text-white font-semibold px-8 py-6 text-lg transition-all duration-300 shadow-lg hover:shadow-primary/50"
          >
            <Link href="/events">Explore All Events</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="text-primary hover:bg-primary hover:text-white font-semibold px-8 py-6 text-lg transition-all duration-300 shadow-lg"
          >
            <a
              href="https://www.youtube.com/@NairobiDevopsCommunity"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <Youtube className="w-5 h-5" />
              <span>Visit Channel Library</span>
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

// --- Community Projects Section Component ---
const CommunityProjectsSection: React.FC = () => (
  <section
    className="py-12 sm:py-16 lg:py-20 bg-gray-50"
    aria-labelledby="community-projects-heading"
  >
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="text-center mb-10 sm:mb-12 lg:mb-16 px-4">
        <h2
          id="community-projects-heading"
          className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4"
        >
          Community Projects
        </h2>
        <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 leading-tight mb-3">
          Building Together, One Project at a Time
        </p>
        <p className="max-w-3xl mx-auto text-base sm:text-lg text-black">
          We collaborate on tools, platforms, and experiments that solve real-world problems.
          Whether you&apos;re a designer, developer, or strategist—there&apos;s a place for you
          here.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {projects.map((project: CommunityProject) => (
          <article
            key={project.id}
            className="group h-full flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
          >
            <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
              <img
                src={project.image}
                alt={`${project.title} project screenshot`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                width={400}
                height={225}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            <CardHeader className="flex-1 p-5 sm:p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">
                  {project.title}
                </CardTitle>
                {(() => {
                  // Safely compute an ISO date string if the provided date is parseable.
                  // This prevents runtime errors from invalid Date parsing (e.g., "Oct 2024").
                  const d = new Date(project.date);
                  const iso = isNaN(d.getTime()) ? undefined : d.toISOString().split("T")[0];
                  return (
                    <time
                      dateTime={iso}
                      className="text-sm font-medium text-slate-500 whitespace-nowrap flex-shrink-0 sm:mt-0.5"
                    >
                      {project.date}
                    </time>
                  );
                })()}
              </div>

              <CardDescription className="text-sm sm:text-base text-black line-clamp-3">
                {project.description}
              </CardDescription>
            </CardHeader>

            <CardFooter className="p-5 sm:p-6 pt-0">
              <Button
                variant="outline"
                className="w-full group/button transition-all duration-200 hover:bg-blue-50 hover:border-blue-200"
                aria-label={`View details for ${project.title} project`}
              >
                <span className="relative">
                  View Project
                  <span
                    className="absolute -right-5 opacity-0 group-hover/button:opacity-100 group-hover/button:translate-x-1.5 transition-all duration-200"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </span>
              </Button>
            </CardFooter>
          </article>
        ))}
      </div>
    </div>
  </section>
);

// --- Collaboration CTA Section Component ---
const CollaborationCTASection: React.FC = () => {
  // Random CTA background image from galleryData
  const ctaBgUrl = useMemo(() => {
    const picked = getWeightedRandomItem(communityGallery, (img) => (img.priority ? 2 : 1));
    return picked?.url || "";
  }, []);

  return (
    <section
      className="relative py-20 text-white bg-black"
      style={{
        backgroundImage: ctaBgUrl
          ? `linear-gradient(var(--black-overlay), var(--black-overlay)), url("${ctaBgUrl}")`
          : undefined,
        backgroundSize: ctaBgUrl ? "cover" : undefined,
        backgroundPosition: ctaBgUrl ? "center" : undefined,
        backgroundRepeat: ctaBgUrl ? "no-repeat" : undefined,
      }}
    >
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl text-primary font-bold mb-6">
          Collaboration That Drives Innovation
        </h2>
        <p className="text-xl mb-8 max-w-6xl mx-auto">
          The Nairobi DevOps Community thrives through strategic partnerships with forward-thinking
          organizations. Together, we co-create impactful experiences, tools, and learning
          opportunities that empower developers, designers, engineers, and students across Kenya.
          Whether you&apos;re a tech startup, open-source collective, or corporate leader, we
          welcome collaborations that foster growth, inclusivity, and innovation.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center ">
          <Button
            asChild
            size="lg"
            className="flex items-center text-lg px-8 py-4 hover:bg-[#023047] transition-colors duration-200"
          >
            <Link href="/partners">
              <Handshake className="mr-2 h-5 w-5" aria-hidden />
              Partner with Us
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="flex items-center text-lg px-8 py-4 bg-white/10 border-white/20 text-white hover:bg-white hover:text-black"
            asChild
          >
            <a href="https://linktr.ee/nairobidevops" target="_blank" rel="noopener noreferrer">
              <Users className="mr-2 h-5 w-5" aria-hidden />
              Join the community
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

// --- Main Community Page Component ---
export default function CommunityPage() {
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    const handleScroll = () => {
      // Clear any existing timeout before scheduling a new one
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }

      if (window.location.hash) {
        const id = window.location.hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          // Small timeout to ensure DOM is ready and layout is stable
          timerRef.current = setTimeout(() => {
            element.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      }
    };

    // Run on initial mount
    handleScroll();

    // Listen for hash changes in-page
    window.addEventListener("hashchange", handleScroll);

    return () => {
      window.removeEventListener("hashchange", handleScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-900">
      <Navbar />
      <HeroGallery />
      <WhatDefinesUsSection />
      <EmpoweringCommunitySection />
      <CampusTourSection />
      <DevOpsCultureSection />
      <DevOpsCoursesSection />
      <EventsMeetupsSection />
      <CommunityProjectsSection />
      <CollaborationCTASection />
      <Footer />
    </div>
  );
}
