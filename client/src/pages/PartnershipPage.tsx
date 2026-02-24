import { zodResolver } from "@hookform/resolvers/zod";
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Globe,
  GraduationCap,
  Handshake,
  Lightbulb,
  Mail,
  MessageSquare,
  Rocket,
  Target,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import * as z from "zod";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { SponsorsCarousel } from "@/components/SponsorsCarousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatisticCounter from "@/components/ui/StatisticCounter";
import { Textarea } from "@/components/ui/textarea";
import { communityGallery } from "@/data/galleryData";
import { statisticsData } from "@/data/ndcData";
import { testimonialsData } from "@/data/testimonialsData";
import { seededRandom } from "@/lib/random";

// Default CTA background used as fallback
const DEFAULT_CTA_BG =
  "https://ik.imagekit.io/nairobidevops/ndcAssets/IMG_9550.jpg?updatedAt=1764488001161";

// Hero Section Component
function HeroSection() {
  // Initialize with fallback to match server-side rendering
  const [bgUrl] = useState(() => {
    if (communityGallery && communityGallery.length > 0) {
      const pool = communityGallery.flatMap((img) => (img.priority ? [img, img] : [img]));
      const idx = Math.floor(Math.random() * pool.length);
      return pool[idx]?.url || DEFAULT_CTA_BG;
    }
    return DEFAULT_CTA_BG;
  });

  return (
    <section
      className="relative min-h-[60vh] flex items-center justify-center text-white"
      style={{
        backgroundImage: `url('${bgUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* overlay darkens only the background image, keeping text readable */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center py-20">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
          Together, We Build <span className="text-primary">Better</span>
        </h1>
        <p className="text-md md:text-lg text-white/80 max-w-3xl mx-auto mb-8 leading-relaxed">
          Partner with us to empower the next generation of DevOps professionals and shape
          Kenya&apos;s tech future
        </p>
      </div>
    </section>
  );
}

// Partners Grid Section
function PartnersGridSection() {
  return (
    <section className="py-16 md:py-24 bg-accent dark:bg-muted-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Our Partners</h2>
          <div className="w-20 h-1 bg-primary mx-auto rounded-full"></div>
          <p className="text-lg text-foreground/80 dark:text-foreground max-w-3xl mx-auto text-pretty">
            {/* text-md md:text-lg text-white/80 max-w-3xl mx-auto mb-8 leading-relaxed */}
            Trusted organizations collaborating with us to grow Kenya’s DevOps ecosystem through
            education, innovation, and opportunity.
          </p>
        </div>
        <SponsorsCarousel />
      </div>
    </section>
  );
}

// Partnership Models Section
function PartnershipModelsSection() {
  const models = [
    {
      icon: Handshake,
      title: "Community Partnership",
      description: "Join our mission to grow Kenya's DevOps ecosystem",
      benefits: [
        "Co-host meetups and workshops",
        "Share knowledge and resources",
        "Access to our growing network",
        "Community recognition",
      ],
      color: "bg-blue-500",
    },
    {
      icon: Target,
      title: "Strategic Partner",
      description: "Deep collaboration on long-term initiatives",
      benefits: [
        "Joint program development",
        "Exclusive branding opportunities",
        "Strategic advisory input",
        "Priority event sponsorship",
      ],
      color: "bg-purple-500",
    },
    {
      icon: Rocket,
      title: "Technology Partner",
      description: "Provide tools and platforms for learning",
      benefits: [
        "Product showcases and demos",
        "Early adopter community",
        "Direct feedback channel",
        "Co-marketing opportunities",
      ],
      color: "bg-green-500",
    },
    {
      icon: Award,
      title: "Event Sponsor",
      description: "Support our events and reach engaged audiences",
      benefits: [
        "Brand visibility at events",
        "Speaking opportunities",
        "Recruitment access",
        "Digital presence",
      ],
      color: "bg-orange-500",
    },
  ];

  return (
    <section className="py-16 md:py-20 dark:bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Partnership Models</h2>
          <h3 className="text-2xl font-bold max-w-2xl mx-auto dark:text-white mb-4">
            Choose Your Path to Impact
          </h3>
          <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full"></div>
          <p className="text-md md:text-lg max-w-3xl mx-auto mb-8 leading-relaxed dark:text-white">
            Whether you&apos;re a grassroots initiative, a global tech company, or an academic
            institution, Nairobi DevOps Community offers flexible partnership models designed to
            amplify your mission while driving real change in Kenya’s tech ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {models.map((model) => {
            const Icon = model.icon;
            return (
              <Card
                key={model.title}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary"
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`${model.color} p-3 rounded-lg text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{model.title}</CardTitle>
                      <CardDescription className="text-base">{model.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {model.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Statistics/Impact Section
function ImpactStatsSection() {
  const statistics = statisticsData;

  const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    Users,
    GraduationCap,
    Award,
    Calendar,
    Handshake,
  };

  return (
    <section className="py-16 md:py-20 bg-ndc-darkblue dark:bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white dark:text-foreground mb-4">
            Donate & Empower
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto rounded-full"></div>
          <p className="text-lg text-gray-200 dark:text-muted-foreground max-w-2xl mx-auto">
            Our partnerships create meaningful impact across Kenya&apos;s tech ecosystem.{" "}
            <strong>
              Your support helps us build inclusive digital tools, mentor emerging talent, and
              expand access to technology across local communities.
            </strong>{" "}
            Every contribution fuels real change—through workshops, platforms, and people-powered
            innovation.
          </p>
        </div>

        <div className="grid gap-6 grid-flow-row lg:grid-flow-col lg:auto-cols-fr overflow-x-auto lg:overflow-visible">
          {statistics.map((stat) => {
            const Icon = iconMap[stat.icon as string] || Users;
            return (
              <Card
                key={stat.id}
                className="text-center bg-white/10 dark:bg-card/50 backdrop-blur border-white/20 dark:border-border w-full"
              >
                <CardContent className="pt-8 pb-6">
                  <Icon className="h-10 w-10 text-primary mx-auto mb-4" />
                  <StatisticCounter
                    className="text-2xl md:text-4xl font-bold text-white dark:text-foreground mb-2"
                    endValue={stat.number}
                  />
                  <p className="text-gray-200 dark:text-muted-foreground font-medium">
                    {stat.label}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-primary hover:bg-[#023047] text-white px-8 py-4">
            <Link href="/donate">Support a course</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// Success Stories Section
function SuccessStoriesSection() {
  const stories = testimonialsData.successStories;

  return (
    <section className="py-16 md:py-20 bg-background dark:bg-ndc-darkblue">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Success Stories That Inspire Collaboration
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto rounded-full mt-2"></div>
          <p className="text-lg dark:text-muted-foreground max-w-2xl mx-auto">
            Real stories from real partners and volunteers driving change across Kenya. These
            moments reflect the heart of Nairobi DevOps: practical tech, community empowerment, and
            shared growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {stories.map((story) => (
            <Card
              key={story.partner}
              className="relative overflow-hidden bg-primary-light-blue hover:shadow-xl transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full"></div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={story.logo}
                    alt={`${story.partner} logo`}
                    className="h-12 w-auto object-contain"
                  />
                </div>
                <blockquote className="text-lg text-black italic leading-relaxed">
                  &ldquo;{story.quote}&rdquo;
                </blockquote>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Lightbulb className="h-5 w-5" />
                  <span>{story.impact}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = testimonialsData.partners;

  return (
    <section className="py-16 md:py-20 bg-primary-light-blue dark:bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold dark:mb-4">What Our Partners Say</h2>
          <div className=" mt-2 mb-2 w-20 h-1 bg-primary mx-auto rounded-full"></div>
          <p className="dark:text-muted-foreground max-w-2xl mx-auto">
            Our partners help us turn ideas into impact. Through mentorship, funding, and
            collaboration, they’ve empowered local tech talent and supported inclusive solutions
            that serve real community needs. Here’s what they have to say.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="bg-ndc-darkblue">
              <CardContent className="pt-6">
                <div className="mb-6">
                  <svg
                    className="h-10 w-10 text-primary/20"
                    fill="currentColor"
                    viewBox="0 0 32 32"
                  >
                    <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                  </svg>
                </div>
                <p className="text-lg text-white mb-6 leading-relaxed italic">
                  {testimonial.quote}
                </p>
                <div className="border-t border-border pt-4">
                  <p className="font-semibold text-white">{testimonial.author}</p>
                  {testimonial.organization ? (
                    <p className="text-sm text-white">{testimonial.organization}</p>
                  ) : null}
                  {testimonial.role ? (
                    <p className="text-sm text-primary mt-1">{testimonial.role}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section with Contact Form
const partnershipSchema = z.object({
  organization: z.string().min(2, "Organization name must be at least 2 characters").trim(),
  name: z.string().min(2, "Contact person name must be at least 2 characters").trim(),
  email: z.string().email("Please enter a valid email address").trim(),
  interest: z.string().min(2, "Partnership interest is required").trim(),
  message: z.string().min(10, "Message must be at least 10 characters").trim(),
});

type PartnershipFormData = z.infer<typeof partnershipSchema>;

const handlePartnershipSubmit = (data: PartnershipFormData) => {
  // Create mailto link with validated form data
  // encodeURIComponent guards against injection and preserves formatting
  const subject = `Partnership Inquiry - ${data.organization}`;
  const body = `
Organization: ${data.organization}
Contact Person: ${data.name}
Email: ${data.email}
Partnership Interest: ${data.interest}

Message:
${data.message}
  `.trim();

  window.location.href = `mailto:info@nairobidevops.org?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
};

function CTASection() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnershipFormData>({
    resolver: zodResolver(partnershipSchema),
  });

  // Initialize with fallback/random image to match server-side rendering logic or client mount
  const [bgUrl] = useState(() => {
    if (communityGallery && communityGallery.length > 0) {
      const pool = communityGallery.flatMap((img) => (img.priority ? [img, img] : [img]));
      const idx = Math.floor(seededRandom() * pool.length);
      return pool[idx]?.url || DEFAULT_CTA_BG;
    }
    return DEFAULT_CTA_BG;
  });

  return (
    <section className="py-16 md:py-20 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={bgUrl} alt="" className="w-full h-full object-cover" />
      </div>
      {/* overlay for readability */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left: Text only (clear hierarchy, reusable text constants) */}
          <div className="text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Let’s Build the Future Together</h2>
            <p className="text-lg text-white/90 max-w-xl">
              We’re always looking for passionate collaborators who believe in the power of
              community, education, and innovation. Whether you&apos;re a tech company, educator, or
              changemaker, we’d love to hear from you.
            </p>
            <div className="w-20 h-1 bg-primary mt-6 rounded-full mb-6" />
          </div>

          {/* Right: Form (structure, validation, and behavior preserved) */}
          <div>
            <Card className="border-2">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit(handlePartnershipSubmit)} className="space-y-6">
                  <h3 className="text-2xl font-bold text-primary mb-2">Become a Partner</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="organization" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        Organization Name *
                      </Label>
                      <Input
                        id="organization"
                        placeholder="Your organization"
                        className={`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${errors.organization ? "border-red-500" : ""}`}
                        {...register("organization")}
                      />
                      {errors.organization && (
                        <p className="text-sm text-red-500">{errors.organization.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Contact Person *
                      </Label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        className={`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${errors.name ? "border-red-500" : ""}`}
                        {...register("name")}
                      />
                      {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        className={`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${errors.email ? "border-red-500" : ""}`}
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interest" className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Partnership Interest *
                      </Label>
                      <Input
                        id="interest"
                        placeholder="e.g., Event Sponsorship"
                        className={`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${errors.interest ? "border-red-500" : ""}`}
                        {...register("interest")}
                      />
                      {errors.interest && (
                        <p className="text-sm text-red-500">{errors.interest.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Message *
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us about your partnership goals..."
                      rows={5}
                      className={`resize-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${errors.message ? "border-red-500" : ""}`}
                      {...register("message")}
                    />
                    {errors.message && (
                      <p className="text-sm text-red-500">{errors.message.message}</p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Button
                      type="submit"
                      size="lg"
                      className="bg-primary hover:bg-ndc-darkblue text-white px-8 py-6 text-lg"
                    >
                      <Mail className="mr-2 h-5 w-5" />
                      Submit Partnership Inquiry
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

// Main Partnership Page Component
export default function PartnershipPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <HeroSection />
      <PartnersGridSection />
      <PartnershipModelsSection />
      <ImpactStatsSection />
      <SuccessStoriesSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
