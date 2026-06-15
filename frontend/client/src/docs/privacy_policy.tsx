import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function PrivacyPolicy() {
  // Static last updated date (set to project release date)
  const formattedLastUpdated = "December 16, 2025";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center text-foreground">
            Nairobi DevOps Community Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-8 text-center">
            Last updated: {formattedLastUpdated}
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Your privacy and data protection are important to us. This Privacy Policy explains how
            Nairobi DevOps Community (&quot;we,&quot; &quot;our,&quot; or &quot;the
            Community&rdquo;) collects, uses, shares, and protects your personal data across all
            platforms, events, and services we operate. We are committed to compliance with
            applicable data protection laws, including Kenya&apos;s Data Protection Act (2019), the
            GDPR (where applicable), and other relevant standards.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Section 1: Who We Are */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">1. Who We Are</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Nairobi DevOps Community is a volunteer-led, open tech community founded in Nairobi,
              Kenya. We organize meetups, conferences, workshops, and online learning opportunities
              for individuals interested in DevOps, cloud computing, and related technologies.
            </p>
            <div className="space-y-2 text-muted-foreground leading-relaxed">
              <p>
                <span className="font-semibold text-foreground">Contact Information:</span>
              </p>
              <p>
                <span className="font-semibold text-foreground">Email: </span>
                <a href="mailto:info@nairobidevops.org" className="text-primary hover:underline">
                  info@nairobidevops.org
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
                  https://nairobidevops.org
                </a>
              </p>
            </div>
          </section>

          {/* Section 2: What Data We Collect */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              2. What Data We Collect
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We may collect the following types of personal data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
              <li>
                <span className="font-semibold text-foreground">Identity Data: </span>
                Full name, email address, phone number, gender (optional), country, and
                organization.
              </li>
              <li>
                <span className="font-semibold text-foreground">Professional Data: </span>
                Job title, industry, area of expertise, or education background.
              </li>
              <li>
                <span className="font-semibold text-foreground">Participation Data: </span>
                Event registrations, feedback, photos, and videos from events.
              </li>
              <li>
                <span className="font-semibold text-foreground">Technical Data: </span>
                IP address, browser type, device type, location (general), and cookies (see Section
                7).
              </li>
              <li>
                <span className="font-semibold text-foreground">Communication Data: </span>
                Messages or queries you send us via email, forms, or social media.
              </li>
            </ul>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              We do not intentionally collect data from minors under 18 without verified guardian
              consent.
            </p>
          </section>

          {/* Section 3: How We Use Your Data */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              3. How We Use Your Data
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We process personal data to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
              <li>Register and manage event participation</li>
              <li>Send updates, announcements, and newsletters</li>
              <li>Create badges and certificates</li>
              <li>Record attendance and community engagement statistics</li>
              <li>Respond to inquiries or community reports</li>
              <li>Share event content (e.g., photos, videos, presentations)</li>
              <li>Improve our programs and user experience</li>
              <li>Comply with legal and regulatory obligations</li>
            </ul>
          </section>

          {/* Section 4: Legal Basis for Processing */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              4. Legal Basis for Processing
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We rely on the following lawful grounds:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
              <li>
                <span className="font-semibold text-foreground">Consent </span>– When you opt-in to
                our newsletters or event communications
              </li>
              <li>
                <span className="font-semibold text-foreground">Legitimate Interest </span>– To grow
                our community and improve user engagement
              </li>
              <li>
                <span className="font-semibold text-foreground">Contractual Obligation </span>– To
                deliver services (e.g., event access or certificates)
              </li>
              <li>
                <span className="font-semibold text-foreground">Legal Compliance </span>– For tax,
                audit, and safeguarding purposes
              </li>
            </ul>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              You may withdraw consent at any time by emailing:{" "}
              <a href="mailto:info@nairobidevops.org" className="text-primary hover:underline">
                info@nairobidevops.org
              </a>
            </p>
          </section>

          {/* Section 5: Data Sharing and Disclosure */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              5. Data Sharing and Disclosure
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We may share your data with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
              <li>Event partners and sponsors (non-sensitive data only, and with consent)</li>
              <li>
                Vendors or service providers helping us run events or manage our systems (e.g.,
                Eventbrite, Google Forms, Zoom)
              </li>
              <li>Government authorities when required by law</li>
            </ul>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              We do not sell or lease your personal data to third parties.
            </p>
          </section>

          {/* Section 6: Data Retention */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              6. Data Retention
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We retain your data only for as long as necessary to fulfill the purposes outlined
              above, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
              <li>2 years for event participation records</li>
              <li>5 years for legal and reporting obligations</li>
              <li>Until you unsubscribe for newsletters or community communications</li>
            </ul>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Anonymized data may be retained for statistical purposes indefinitely.
            </p>
          </section>

          {/* Section 7: Cookies and Tracking Technologies */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              7. Cookies and Tracking Technologies
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Our website and event platforms may use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
              <li>Maintain secure login sessions</li>
              <li>Understand site usage trends</li>
              <li>Remember preferences</li>
              <li>Improve content and user experience</li>
            </ul>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              You can manage cookie settings in your browser. Some features may not function
              properly without cookies.
            </p>
          </section>

          {/* Section 8: Data Security */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              8. Data Security
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your data
              from:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4 mb-4">
              <li>Unauthorized access</li>
              <li>Data breaches or leaks</li>
              <li>Loss or destruction</li>
            </ul>
            <p className="text-muted-foreground mb-2 leading-relaxed">These include:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4 mb-4">
              <li>Encryption of sensitive data</li>
              <li>Access controls and role-based permissions</li>
              <li>Secure communication channels (e.g., HTTPS, VPNs)</li>
              <li>Staff and volunteer confidentiality agreements</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              In the event of a breach, we will notify affected individuals and authorities as
              required by law.
            </p>
          </section>

          {/* Section 9: Your Data Rights */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              9. Your Data Rights
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Depending on applicable laws, you may have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4 mb-4">
              <li>Request access to your personal data</li>
              <li>Correct inaccurate or outdated data</li>
              <li>Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li>Object to or restrict processing</li>
              <li>Withdraw consent at any time</li>
              <li>
                File a complaint with the Office of the Data Protection Commissioner (ODPC) in Kenya
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              To exercise your rights, contact:{" "}
              <a href="mailto:info@nairobidevops.org" className="text-primary hover:underline">
                info@nairobidevops.org
              </a>
            </p>
          </section>

          {/* Section 10: Third-Party Links */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              10. Third-Party Links
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Our website or emails may link to third-party platforms (e.g., Zoom, GitHub, Meetup).
              We are not responsible for the privacy practices of these external sites. We encourage
              you to read their privacy policies before providing any personal data.
            </p>
          </section>

          {/* Section 11: Changes to This Policy */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              11. Changes to This Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy to reflect legal or operational changes. The latest
              version will always be available on our website with a &quot;last updated&quot; date.
              We encourage you to review it periodically.
            </p>
          </section>

          {/* Section 12: Contact Us */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">12. Contact Us</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              If you have questions or concerns about this Privacy Policy or how your data is
              handled:
            </p>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                <span className="font-semibold text-foreground">Nairobi DevOps Community</span>
              </p>
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
                  https://nairobidevops.org
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
