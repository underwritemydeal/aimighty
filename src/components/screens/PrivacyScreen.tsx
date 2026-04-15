import { useState, useEffect, memo } from 'react';

interface PrivacyScreenProps {
  onBack: () => void;
}

const BackIcon = memo(function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
});

export function PrivacyScreen({ onBack }: PrivacyScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative"
      style={{
        background: 'var(--color-void)',
        minHeight: '100dvh',
        color: 'rgba(255,248,240,0.95)',
      }}
      role="main"
      aria-labelledby="privacy-heading"
    >
      {/* AImighty logo — top center */}
      <div
        className="fixed top-5 left-1/2 z-20"
        style={{
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-display)',
          fontSize: '1.1rem',
          fontWeight: 300,
          letterSpacing: '0.05em',
        }}
      >
        <span style={{ color: '#d4af37' }}>AI</span>
        <span style={{ color: 'rgba(255,248,240,0.95)' }}>mighty</span>
      </div>
      {/* Back button */}
      <nav
        className="fixed top-4 left-4 z-20"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        <button
          onClick={onBack}
          aria-label="Go back"
          className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'rgba(255, 255, 255, 0.5)' }}
        >
          <BackIcon />
          <span style={{ fontSize: 'var(--text-sm)' }}>Back</span>
        </button>
      </nav>

      {/* Content */}
      <div className="relative z-10 overflow-y-auto" style={{ minHeight: '100dvh' }}>
        <div
          className="max-w-[800px] mx-auto px-6 py-20"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s ease',
          }}
        >
          <h1
            id="privacy-heading"
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 300,
              color: '#d4af37',
            }}
          >
            Privacy Policy
          </h1>

          <p
            className="mb-2"
            style={{
              fontSize: 'var(--text-sm)',
              color: 'rgba(255, 255, 255, 0.35)',
            }}
          >
            Last Updated: April 14, 2026
          </p>
          <p
            className="mb-8"
            style={{
              fontSize: 'var(--text-sm)',
              color: 'rgba(255, 255, 255, 0.35)',
            }}
          >
            Effective Date: April 14, 2026
          </p>

          <div
            className="space-y-6"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-base)',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: 1.8,
            }}
          >
            <p>
              AImighty LLC ("AImighty," "we," "us," or "our") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the AImighty website at aimightyme.com and the AImighty progressive web application (collectively, the "Service").
            </p>
            <p>
              Please read this Privacy Policy carefully. By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with our policies and practices, do not use the Service.
            </p>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 1 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                1. INFORMATION WE COLLECT
              </h2>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                1.1 Information You Provide Directly
              </h3>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li><strong>Account Information:</strong> When you create an account, we collect your email address and an encrypted version of your password. We do not store your password in plain text.</li>
                <li><strong>Belief System Preference:</strong> The spiritual or philosophical tradition you select within the app (e.g., Christianity, Islam, Buddhism, etc.).</li>
                <li><strong>Language Preference:</strong> Your selected language for the Service interface and AI responses.</li>
                <li><strong>Conversation Content:</strong> The text messages and voice transcriptions you send to the Service, and the AI-generated responses you receive. Voice recordings from speech-to-text are processed in your browser and are not transmitted to our servers — only the resulting text transcription is sent.</li>
                <li><strong>Subscription and Payment Information:</strong> If you subscribe to a paid plan, payment is processed through Stripe, Inc. We do not collect, store, or have access to your full credit card number, debit card number, or bank account information. Stripe handles all payment processing in accordance with PCI-DSS standards. We receive only a confirmation of payment, your subscription status, and a Stripe customer identifier.</li>
              </ul>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                1.2 Information Collected Automatically
              </h3>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li><strong>Usage Data:</strong> We collect information about how you interact with the Service, including features used, pages visited, time spent in the app, number of conversations, number of messages sent, and belief systems accessed.</li>
                <li><strong>Device Information:</strong> We may collect device type, operating system, browser type, browser version, screen resolution, and unique device identifiers.</li>
                <li><strong>Log Data:</strong> Our servers automatically record information when you access the Service, including your IP address, the date and time of your request, referring URL, and pages viewed.</li>
                <li><strong>Cookies and Similar Technologies:</strong> We use essential cookies to maintain your session and preferences (such as login state, language selection, and belief system preference). We do not use third-party advertising cookies. See Section 8 for more details.</li>
              </ul>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                1.3 Sensitive Personal Information
              </h3>
              <div
                className="p-4 rounded-xl mt-4"
                style={{
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                }}
              >
                <p style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                  <strong>Your belief system selection is considered sensitive personal information.</strong> We treat this data with heightened security measures. We will never:
                </p>
                <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                  <li>Sell your belief system preference to any third party</li>
                  <li>Share your belief system preference with advertisers</li>
                  <li>Use your belief system preference to discriminate against you in any way</li>
                  <li>Disclose your belief system preference publicly</li>
                </ul>
              </div>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 2 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                2. HOW WE USE YOUR INFORMATION
              </h2>
              <p>We use the information we collect for the following purposes:</p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                2.1 Providing the Service
              </h3>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li>To create and manage your account</li>
                <li>To generate AI-powered conversational responses based on your selected belief system</li>
                <li>To process your messages and deliver AI-generated text and voice responses</li>
                <li>To personalize your experience based on your preferences</li>
                <li>To process payments and manage subscriptions</li>
              </ul>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                2.2 Improving the Service
              </h3>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li>To understand how users interact with the Service and identify areas for improvement</li>
                <li>To monitor and analyze usage trends and patterns</li>
                <li>To develop new features and functionality</li>
                <li>To improve the quality and accuracy of AI-generated responses</li>
              </ul>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                2.3 Safety and Security
              </h3>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li>To detect, investigate, and prevent fraudulent, abusive, or illegal activity</li>
                <li>To enforce our Terms of Service and protect the safety of our users</li>
                <li>To implement rate limiting and abuse prevention measures</li>
                <li>To monitor for crisis situations (e.g., expressions of self-harm) and ensure safety guardrails function properly</li>
              </ul>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                2.4 Communications
              </h3>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li>To send you important service-related communications (e.g., account verification, security alerts, subscription changes)</li>
                <li>To send you optional marketing communications if you have opted in (e.g., the "Daily Wisdom" newsletter)</li>
                <li>You may opt out of marketing communications at any time by clicking the unsubscribe link or contacting us</li>
              </ul>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 3 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                3. HOW WE SHARE YOUR INFORMATION
              </h2>
              <p><strong style={{ color: 'rgba(255, 255, 255, 0.95)' }}>We do not sell your personal information.</strong> We share your information only in the following limited circumstances:</p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                3.1 Third-Party Service Providers
              </h3>
              <p>We use trusted third-party services to operate the Service. These providers have access to your information only as necessary to perform their functions and are obligated to protect your data:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li><strong>Anthropic (Claude API):</strong> Your conversation messages (text only) are sent to Anthropic's Claude API to generate AI responses. Anthropic processes this data according to their API Terms of Service and Privacy Policy. Anthropic does not use API data to train their models. See: <a href="https://www.anthropic.com/privacy" style={{ color: '#d4af37' }}>https://www.anthropic.com/privacy</a></li>
                <li><strong>OpenAI (Text-to-Speech):</strong> AI-generated response text is sent to OpenAI's TTS API to generate voice audio for Divine tier subscribers. OpenAI processes this data according to their API Terms of Service. See: <a href="https://openai.com/policies/privacy-policy" style={{ color: '#d4af37' }}>https://openai.com/policies/privacy-policy</a></li>
                <li><strong>Cloudflare:</strong> Our API runs on Cloudflare Workers. Cloudflare processes requests and may log IP addresses for security purposes. See: <a href="https://www.cloudflare.com/privacypolicy/" style={{ color: '#d4af37' }}>https://www.cloudflare.com/privacypolicy/</a></li>
                <li><strong>Vercel:</strong> Our website is hosted on Vercel. See: <a href="https://vercel.com/legal/privacy-policy" style={{ color: '#d4af37' }}>https://vercel.com/legal/privacy-policy</a></li>
                <li><strong>Stripe:</strong> Payment processing is handled by Stripe. See: <a href="https://stripe.com/privacy" style={{ color: '#d4af37' }}>https://stripe.com/privacy</a></li>
              </ul>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                3.2 Legal Requirements
              </h3>
              <p>
                We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court order, subpoena, or government request).
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                3.3 Protection of Rights
              </h3>
              <p>
                We may disclose your information when we believe in good faith that disclosure is necessary to protect our rights, your safety, the safety of others, investigate fraud, or respond to a government request.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                3.4 Business Transfers
              </h3>
              <p>
                If AImighty is involved in a merger, acquisition, reorganization, or sale of assets, your information may be transferred as part of that transaction. We will notify you via email and/or a prominent notice on our Service of any change in ownership or uses of your personal information.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                3.5 With Your Consent
              </h3>
              <p>
                We may share your information with third parties when you have given us explicit consent to do so.
              </p>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 4 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                4. DATA RETENTION
              </h2>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                4.1 Account Data
              </h3>
              <p>
                We retain your account information (email, encrypted password, preferences) for as long as your account remains active. If you delete your account, we will delete your account data within 30 days.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                4.2 Conversation Data
              </h3>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li><strong>Free and Believer tier:</strong> Conversations are stored in your browser's local storage and are not transmitted to or stored on our servers beyond the duration of the API request.</li>
                <li><strong>Divine tier:</strong> Conversation history may be stored on our servers to provide the conversation history feature. This data is retained for as long as your account remains active. You may delete your conversation history at any time through the app settings.</li>
              </ul>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                4.3 Payment Data
              </h3>
              <p>
                We retain transaction records (amount, date, subscription status) for accounting and legal compliance purposes for up to 7 years, in accordance with applicable tax and financial regulations.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                4.4 Log and Usage Data
              </h3>
              <p>
                Server logs and usage analytics data are retained for up to 90 days for security monitoring and service improvement purposes, after which they are automatically deleted.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                4.5 Account Deletion
              </h3>
              <p>When you request account deletion:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li>Your email, password, and preferences are deleted within 30 days</li>
                <li>Your conversation history is permanently deleted within 30 days</li>
                <li>Your Stripe subscription is cancelled</li>
                <li>Certain anonymized usage data may be retained for aggregate analytics</li>
                <li>Data required for legal compliance may be retained as required by law</li>
              </ul>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 5 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                5. DATA SECURITY
              </h2>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                5.1 Security Measures
              </h3>
              <p>We implement technical and organizational security measures designed to protect your personal information, including:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li><strong>Encryption in transit:</strong> All data transmitted between your device and our servers is encrypted using TLS/SSL (HTTPS)</li>
                <li><strong>Password hashing:</strong> Passwords are hashed using industry-standard algorithms and are never stored in plain text</li>
                <li><strong>API key protection:</strong> All third-party API keys are stored as encrypted secrets in Cloudflare Workers and are never exposed to frontend code or included in client-side bundles</li>
                <li><strong>Rate limiting:</strong> Per-user and per-IP rate limits prevent abuse and protect against unauthorized access</li>
                <li><strong>Access control:</strong> Access to user data is restricted to essential personnel on a need-to-know basis</li>
                <li><strong>CORS restrictions:</strong> Our API only accepts requests from authorized domains</li>
              </ul>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                5.2 No Absolute Security
              </h3>
              <p>
                While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security. You acknowledge that you provide your information at your own risk.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                5.3 Breach Notification
              </h3>
              <p>
                In the event of a data breach that affects your personal information, we will notify you by email and/or through a notice on our Service within 72 hours of becoming aware of the breach, as required by applicable law.
              </p>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 6 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                6. YOUR RIGHTS AND CHOICES
              </h2>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                6.1 Access and Portability
              </h3>
              <p>
                You have the right to request a copy of the personal information we hold about you. You may submit a request to support@aimightyme.com. We will respond within 30 days.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                6.2 Correction
              </h3>
              <p>
                You have the right to request that we correct any inaccurate personal information we hold about you.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                6.3 Deletion
              </h3>
              <p>
                You have the right to request deletion of your personal information. You may delete your account through the app settings or by contacting us at support@aimightyme.com. Upon receiving a valid deletion request, we will delete your data within 30 days, except where retention is required by law.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                6.4 Opt-Out of Marketing
              </h3>
              <p>
                You may opt out of receiving marketing communications from us at any time by clicking the "unsubscribe" link in any marketing email or by contacting us at support@aimightyme.com.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                6.5 Browser Controls
              </h3>
              <p>
                You may control cookies and local storage through your browser settings. Note that disabling cookies or local storage may affect the functionality of the Service, including login persistence and preference storage.
              </p>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 7 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                7. JURISDICTION-SPECIFIC RIGHTS
              </h2>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                7.1 California Residents (CCPA/CPRA)
              </h3>
              <p>If you are a California resident, you have the following additional rights under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):</p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li><strong>Right to Know:</strong> You have the right to request that we disclose the categories and specific pieces of personal information we have collected about you, the categories of sources from which the information was collected, the business purpose for collecting the information, and the categories of third parties with whom we share the information.</li>
                <li><strong>Right to Delete:</strong> You have the right to request deletion of your personal information, subject to certain exceptions.</li>
                <li><strong>Right to Opt-Out of Sale:</strong> We do not sell your personal information. If this changes, we will provide a "Do Not Sell or Share My Personal Information" link.</li>
                <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA/CPRA rights.</li>
              </ul>
              <p className="mt-4">
                To exercise your California privacy rights, contact us at <a href="mailto:privacy@aimightyme.com" style={{ color: '#d4af37' }}>privacy@aimightyme.com</a> or call us at the number listed in our Contact section.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                7.2 European Economic Area, United Kingdom, and Switzerland Residents (GDPR/UK GDPR)
              </h3>
              <p>If you are a resident of the EEA, UK, or Switzerland, you have the following additional rights under the General Data Protection Regulation (GDPR):</p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li><strong>Legal Basis for Processing:</strong> We process your personal data based on: (a) your consent (which you may withdraw at any time); (b) performance of a contract (providing the Service you signed up for); (c) compliance with legal obligations; and (d) our legitimate interests (improving our Service and preventing abuse), balanced against your rights and interests.</li>
                <li><strong>Right of Access:</strong> You may request a copy of your personal data.</li>
                <li><strong>Right to Rectification:</strong> You may request correction of inaccurate data.</li>
                <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> You may request deletion of your data.</li>
                <li><strong>Right to Restrict Processing:</strong> You may request that we restrict processing of your data.</li>
                <li><strong>Right to Data Portability:</strong> You may request your data in a structured, commonly used, machine-readable format.</li>
                <li><strong>Right to Object:</strong> You may object to the processing of your data based on our legitimate interests.</li>
                <li><strong>Right to Withdraw Consent:</strong> Where we rely on consent, you may withdraw it at any time without affecting the lawfulness of processing prior to withdrawal.</li>
                <li><strong>Right to Lodge a Complaint:</strong> You have the right to lodge a complaint with your local data protection supervisory authority.</li>
              </ul>
              <p className="mt-4">
                <strong>Data Transfers:</strong> Your data may be transferred to and processed in the United States, where our servers and service providers are located. We ensure appropriate safeguards are in place for such transfers, including Standard Contractual Clauses where applicable.
              </p>
              <p className="mt-4">
                To exercise your GDPR rights, contact us at <a href="mailto:privacy@aimightyme.com" style={{ color: '#d4af37' }}>privacy@aimightyme.com</a>.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                7.3 Other Jurisdictions
              </h3>
              <p>
                We are committed to complying with applicable data protection laws in all jurisdictions where we operate. If you have questions about your specific rights under local law, please contact us at <a href="mailto:privacy@aimightyme.com" style={{ color: '#d4af37' }}>privacy@aimightyme.com</a>.
              </p>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 8 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                8. COOKIES AND LOCAL STORAGE
              </h2>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                8.1 What We Use
              </h3>
              <p>AImighty uses the following client-side storage technologies:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li><strong>Essential cookies/localStorage:</strong> Used to maintain your login session, store your belief system preference, language selection, voice toggle state, and other functional preferences. These are necessary for the Service to function and cannot be disabled.</li>
                <li><strong>We do NOT use:</strong> Third-party advertising cookies, tracking pixels for ad networks, social media tracking cookies, or cross-site tracking technologies.</li>
              </ul>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                8.2 Analytics
              </h3>
              <p>
                We may use privacy-focused analytics (such as aggregate usage counts stored in our own infrastructure) to understand how users interact with the Service. We do not use Google Analytics, Facebook Pixel, or similar third-party tracking services.
              </p>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 9 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                9. CHILDREN'S PRIVACY
              </h2>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                9.1 Age Limitation
              </h3>
              <p>
                The Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13 without verification of parental consent, we will take steps to delete that information promptly.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                9.2 Parental Rights
              </h3>
              <p>
                If you are a parent or guardian and believe that your child under 13 has provided us with personal information, please contact us immediately at <a href="mailto:privacy@aimightyme.com" style={{ color: '#d4af37' }}>privacy@aimightyme.com</a> so that we can take appropriate action.
              </p>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 10 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                10. CONVERSATION DATA AND AI PROCESSING
              </h2>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                10.1 How Conversations Are Processed
              </h3>
              <p>When you send a message in the Service:</p>
              <ol className="list-decimal list-inside space-y-2 mt-4 ml-4">
                <li>Your text message is transmitted via encrypted HTTPS to our Cloudflare Worker proxy</li>
                <li>The Worker forwards your message to the Anthropic Claude API along with the system prompt for your selected belief system</li>
                <li>Claude generates a text response, which is streamed back to your device</li>
                <li>For Divine tier subscribers, the response text is also sent to OpenAI's TTS API to generate voice audio</li>
                <li>The voice audio is streamed back to your device</li>
              </ol>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                10.2 Voice Recordings
              </h3>
              <p>
                If you use the voice input feature, your speech is processed locally on your device using the Web Speech API built into your browser. The audio recording does not leave your device — only the resulting text transcription is sent to our servers. We do not store, access, or process your raw voice recordings.
              </p>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                10.3 AI Training
              </h3>
              <div
                className="p-4 rounded-xl mt-4"
                style={{
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                }}
              >
                <p style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                  <strong>Your conversations are NOT used to train AI models.</strong> Both Anthropic and OpenAI's API terms of service prohibit the use of API data for model training. Your conversations remain private and are not incorporated into any AI training dataset.
                </p>
              </div>

              <h3 className="mt-6 mb-3" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                10.4 Content Moderation
              </h3>
              <p>
                Our AI system includes built-in safety guardrails that automatically detect and respond to crisis situations (e.g., expressions of self-harm, abuse, or medical emergencies). This detection occurs within the AI's response generation and does not involve human review of your conversations. In rare cases where abuse of the Service is detected (e.g., attempts to generate harmful content), we may review relevant conversation logs for the purpose of enforcing our Terms of Service and protecting user safety.
              </p>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 11 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                11. THIRD-PARTY LINKS AND SERVICES
              </h2>
              <p>
                The Service may contain links to third-party websites, including scripture reference sites (e.g., BibleGateway.com, Quran.com), our own article pages, and other external resources. These links are provided for your convenience and do not signify our endorsement of those websites. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites. We encourage you to review the privacy policies of any third-party websites you visit.
              </p>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 12 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                12. INTERNATIONAL DATA TRANSFERS
              </h2>
              <p>
                AImighty is based in the United States. If you are accessing the Service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States and other countries where our service providers operate. By using the Service, you consent to the transfer of your information to countries outside your country of residence, which may have different data protection laws.
              </p>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 13 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                13. CHANGES TO THIS PRIVACY POLICY
              </h2>
              <p>
                We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or through a prominent notice within the Service at least 30 days before the changes take effect. The "Last Updated" date at the top of this page indicates when this Privacy Policy was last revised. Your continued use of the Service after the effective date of the revised Privacy Policy constitutes your acceptance of the changes.
              </p>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            {/* Section 14 */}
            <section>
              <h2 className="mt-8 mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                14. CONTACT US
              </h2>
              <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
              <div className="mt-4">
                <p><strong>AImighty LLC</strong></p>
                <p>Email: <a href="mailto:privacy@aimightyme.com" style={{ color: '#d4af37' }}>privacy@aimightyme.com</a></p>
                <p>General Support: <a href="mailto:support@aimightyme.com" style={{ color: '#d4af37' }}>support@aimightyme.com</a></p>
                <p>Legal Inquiries: <a href="mailto:legal@aimightyme.com" style={{ color: '#d4af37' }}>legal@aimightyme.com</a></p>
                <p>Website: <a href="https://aimightyme.com" style={{ color: '#d4af37' }}>https://aimightyme.com</a></p>
              </div>
              <p className="mt-4">
                For GDPR-related inquiries, you may also contact our Data Protection point of contact at: <a href="mailto:privacy@aimightyme.com" style={{ color: '#d4af37' }}>privacy@aimightyme.com</a>
              </p>
            </section>

            <hr style={{ borderColor: 'rgba(212, 175, 55, 0.3)', margin: '32px 0' }} />

            <p className="text-center italic" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              By using AImighty, you acknowledge that you have read, understood, and agree to this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
