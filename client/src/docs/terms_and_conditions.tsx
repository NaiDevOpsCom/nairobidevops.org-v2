import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center text-foreground">
            Nairobi DevOps Community Terms and Conditions
          </h1>
          <p className="text-sm text-muted-foreground mb-8 text-center">
            Last updated: July 12, 2025
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Welcome to the Nairobi DevOps Community (&quot;NDC&quot;). These Terms and Conditions
            (&quot;Terms&quot;) govern your participation in our community, whether through
            in-person events, online platforms, or community-related initiatives. By engaging with
            NDC, you agree to comply with these Terms.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Section 1: Community Membership */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              1. Community Membership
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  1.1. Free and Open Membership:
                </h3>
                <p>
                  Membership is free and open to individuals interested in DevOps, cloud computing,
                  software engineering, cybersecurity, and related technology fields.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">1.2. Eligibility:</h3>
                <p>
                  Participants must be at least 18 years of age. Exceptions may be granted with
                  guardian consent for student programs.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">1.3. Registration:</h3>
                <p>
                  Certain events and platforms may require registration. You agree to provide
                  accurate and current information when registering.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Community Conduct */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              2. Community Conduct
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  2.1. Code of Conduct:
                </h3>
                <p>
                  All participants must follow the Nairobi DevOps Code of Conduct. Violations may
                  result in warnings, suspensions, or permanent bans.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  2.2. Respect and Inclusion:
                </h3>
                <p>
                  You agree to treat others with respect regardless of background, race, gender,
                  nationality, or beliefs.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Content and Intellectual Property */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              3. Content and Intellectual Property
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">3.1. User Content:</h3>
                <p>
                  When you post, share, or contribute content to any NDC platform (e.g., Discord,
                  LinkedIn, GitHub), you retain ownership but grant NDC a non-exclusive,
                  royalty-free license to use, share, and promote that content.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  3.2. Event Materials:
                </h3>
                <p>
                  Talks, workshops, and media from NDC events may be recorded or photographed. By
                  participating, you grant permission for your image, video, or contributions to be
                  used in our promotional and educational materials.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Data Privacy */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">4. Data Privacy</h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">4.1. Personal Data:</h3>
                <p>
                  We collect basic personal information (name, email, job role) to facilitate
                  community engagement. Data will be handled per applicable privacy laws and will
                  not be sold to third parties.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">4.2. Communications:</h3>
                <p>
                  By joining, you consent to receive occasional updates via email or community
                  channels. You may opt out at any time.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Events and Programs */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              5. Events and Programs
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  5.1. Registration and Access:
                </h3>
                <p>
                  Some events require prior registration. Entry may be denied for non-compliance
                  with event guidelines.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">5.2. Liability:</h3>
                <p>
                  NDC and its organizers are not liable for personal injury, lost property, or
                  damages occurring at events unless caused by proven negligence.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  5.3. Tickets and Refunds:
                </h3>
                <p>
                  Paid events are subject to separate ticketing terms. Refund policies will be
                  disclosed during registration.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Sponsorship and Partnerships */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              6. Sponsorship and Partnerships
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">6.1. Alignment:</h3>
                <p>
                  Sponsors and partners must align with NDC&apos;s mission of fostering innovation,
                  inclusion, and open technology.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">6.2. Ethics:</h3>
                <p>
                  We reserve the right to decline or revoke sponsorships from entities engaging in
                  unethical or discriminatory behavior.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Changes to These Terms */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              7. Changes to These Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms periodically. Changes will be posted on our website.
              Continued participation after updates means you accept the revised Terms.
            </p>
          </section>

          {/* Section 8: Contact Us */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">8. Contact Us</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              For questions or concerns about these Terms, contact:
            </p>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                <span className="font-semibold text-foreground">Email: </span>
                <a href="mailto:info@nairobidevops.org" className="text-primary hover:underline">
                  info@nairobidevops.org
                </a>
              </p>
              <p>
                <span className="font-semibold text-foreground">Phone: </span>
                <a href="tel:+254796445130" className="text-primary hover:underline">
                  +254 796 445130
                </a>
              </p>
              <p>
                <span className="font-semibold text-foreground">Website: </span>
                <a
                  href="https://nairobidevops.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  nairobidevops.org
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
