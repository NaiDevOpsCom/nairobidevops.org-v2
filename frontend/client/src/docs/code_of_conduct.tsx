import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function CodeOfConduct() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center text-foreground">
            Community Code of Conduct
          </h1>
          <blockquote className="text-xl md:text-2xl italic text-primary mb-8 font-medium text-center">
            &quot;In DevOps, every mind adds pipeline; together we build continuity.&rdquo;
          </blockquote>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The Nairobi DevOps Community exists to cultivate a safe, inclusive, and empowering
            environment for technologists across Africa. This Code of Conduct outlines the
            expectations for behavior, accountability, and culture across all our events, platforms,
            and spaces. By participating, you agree to uphold these values to foster a collaborative
            and respectful ecosystem.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Section 1: Core Principles */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              1. Our Core Principles
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Collaboration</h3>
                <p>
                  – We believe in shared growth through open dialogue, community-driven learning,
                  and mutual support.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Respect</h3>
                <p>
                  – We treat each other with dignity, regardless of background, experience, or
                  opinion. We assume positive intent and engage constructively.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Inclusion</h3>
                <p>
                  – We welcome people of all races, genders, sexual orientations, ethnicities,
                  abilities, religions, socioeconomic backgrounds, and experience levels.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Professionalism</h3>
                <p>
                  – We maintain a professional standard of communication and behavior that reflects
                  positively on the community.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Expected Behaviors */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              2. Expected Behaviors
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              All participants, whether in-person or online, are expected to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
              <li>Be welcoming and courteous to others.</li>
              <li>Communicate using clear, inclusive, and respectful language.</li>
              <li>Acknowledge others&apos; contributions and efforts.</li>
              <li>Ask for help or clarification with humility and patience.</li>
              <li>Be open to diverse viewpoints and constructive feedback.</li>
              <li>Provide feedback with kindness, not judgment.</li>
              <li>Respect boundaries in digital and physical spaces.</li>
              <li>Encourage participation from everyone, especially newcomers.</li>
            </ul>
          </section>

          {/* Section 3: Unacceptable Behaviors */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              3. Unacceptable Behaviors
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Unacceptable behaviors include, but are not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
              <li>Harassment, bullying, or intimidation in any form.</li>
              <li>Discrimination based on identity or background.</li>
              <li>Offensive, abusive, or sexually explicit comments, jokes, or images.</li>
              <li>Threats, stalking, or physical violence.</li>
              <li>Non-consensual photography, recording, or screenshotting.</li>
              <li>Sharing someone&apos;s personal information without permission (doxxing).</li>
              <li>Disruptive behavior during presentations, workshops, or discussions.</li>
              <li>Repeated and unwanted direct messages or communication.</li>
              <li>Impersonation of community members or leaders.</li>
              <li>Bypassing moderation or disciplinary actions.</li>
            </ul>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Any of these behaviors, whether at events, online, or via private communication
              connected to the community, will not be tolerated.
            </p>
          </section>

          {/* Section 4: Scope of Application */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              4. Scope of Application
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              This Code of Conduct applies to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
              <li>
                All Nairobi DevOps events (meetups, summits, workshops, hackathons, networking
                mixers).
              </li>
              <li>
                Digital platforms managed by the community (Discord, Slack, GitHub, Zoom, YouTube,
                social media).
              </li>
              <li>
                Interactions involving community representatives, members, volunteers, and partners.
              </li>
              <li>
                Communication under the community&apos;s name or in association with its branding.
              </li>
            </ul>
          </section>

          {/* Section 5: Reporting and Enforcement */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              5. Reporting and Enforcement
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We take violations seriously. If you witness or experience a breach of this Code of
              Conduct:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4 mb-6">
              <li>
                Report via email:{" "}
                <a
                  href="mailto:codeofconduct@nairobidevops.org"
                  className="text-primary hover:underline"
                >
                  codeofconduct@nairobidevops.org
                </a>
              </li>
              <li>
                Contact an organizer: Identify team members at events by branded badges or shirts.
              </li>
              <li>
                Submit a report anonymously: Form available at{" "}
                <a
                  href="https://nairobidevops.org/report"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  nairobidevops.org/report
                </a>
              </li>
            </ul>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              All reports will be handled confidentially. The Code of Conduct Committee will:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4 mb-4">
              <li>Acknowledge receipt within 48 hours.</li>
              <li>Investigate promptly, documenting and reviewing facts.</li>
              <li>
                Decide on appropriate actions, including:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>A verbal or written warning</li>
                  <li>Temporary or permanent removal from platforms or events</li>
                  <li>Contacting law enforcement if necessary</li>
                </ul>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Retaliation against anyone reporting an incident is strictly prohibited.
            </p>
          </section>

          {/* Section 6: Weapons and Safety Policy */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              6. Weapons and Safety Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Weapons, illegal substances, or dangerous items are not allowed at any Nairobi DevOps
              event. Any participant found in violation will be removed from the venue and reported
              to authorities if needed.
            </p>
          </section>

          {/* Section 7: License and Attribution */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              7. License and Attribution
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              This Code of Conduct is inspired by policies from PSF, and Geek Feminism. It is
              licensed under the Creative Commons Attribution 4.0 International License.
            </p>
          </section>

          {/* Section 8: Commitment to Community */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              8. Commitment to Community
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              By being part of Nairobi DevOps, you contribute to a culture of empathy, knowledge
              sharing, and mutual respect. Thank you for helping build a safe, vibrant, and
              inclusive DevOps ecosystem across Africa.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
