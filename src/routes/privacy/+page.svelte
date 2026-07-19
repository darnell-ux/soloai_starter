<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';

	export const prerender = true;

	// NOTE (for the operator): this is a technical draft written to match what the
	// application actually does today (analytics, consent, processors). It is not
	// legal advice — have counsel review before launch. Legal text is intentionally
	// in English; professional translation is a separate step from UI localization.
	const effectiveDate = 'July 18, 2026';
	const contactEmail = 'privacy@taxnexusapp.com';
</script>

<SeoHead
	pageTitle="Privacy Policy"
	description="How TaxNexus collects, uses, and protects personal data — analytics, cookies, consent, AI processing, and your rights."
/>

<article class="prose prose-sm mx-auto max-w-3xl px-4 py-10">
	<h1>Privacy Policy</h1>
	<p><em>Effective date: {effectiveDate}</em></p>

	<p>
		TaxNexus is operated by <strong>Consult Solutions</strong> (Oakland, California) (“we”, “us”). We
		help Amazon FBA sellers understand potential California sales-tax nexus exposure. This policy
		explains what we collect, why, who we share it with, and the choices you have. It reflects how the
		product actually behaves.
	</p>

	<h2>1. Information we collect</h2>
	<ul>
		<li>
			<strong>Account information.</strong> When you create an account we store your name and email
			address (via our authentication system) and, for subscribers, a billing status.
		</li>
		<li>
			<strong>Nexus assessment inputs.</strong> Figures you enter (or that our browser extension
			detects on Amazon, such as fulfillment-center presence) are used to compute an exposure
			estimate. The assessment endpoint is stateless: these inputs are <strong>not stored</strong>
			and are <strong>never written to our logs</strong>.
		</li>
		<li>
			<strong>Usage &amp; product analytics.</strong> With your consent where required, we use Google
			Analytics 4 (via Google Tag Manager) and Hotjar to understand pages viewed, interactions,
			approximate location, and device/browser — to improve the product.
		</li>
		<li>
			<strong>Cookies &amp; local storage.</strong> Essential items (your login session, language
			preference, and your cookie-consent choice) plus optional analytics cookies (see §3).
		</li>
		<li>
			<strong>AI compliance assistant inputs.</strong> Messages you send to the TaxNexus compliance
			assistant are processed by Anthropic’s Claude API to generate responses. These messages are
			<strong>not stored</strong> by TaxNexus and are <strong>never written to our logs</strong>. Only
			message count and response metadata are retained for rate-limiting and cost-monitoring purposes.
		</li>
	</ul>

	<h2>2. How we use information</h2>
	<ul>
		<li>Provide the service and compute nexus assessments.</li>
		<li>Operate accounts, subscriptions, and support.</li>
		<li>Understand and improve usage (analytics), subject to your consent.</li>
		<li>Send service and, where you’ve opted in, product communications (via our email platform).</li>
	</ul>
	<p>
		We do <strong>not</strong> sell your personal information, and we do not share your sales data with
		third parties for their own marketing purposes.
	</p>

	<h2>3. Cookies &amp; consent</h2>
	<p>
		<strong>Essential cookies</strong> are always on — they’re required to log in, remember your
		language, and record your consent choice.
	</p>
	<p>
		<strong>Analytics cookies are consent-gated and region-aware.</strong> In the United States they
		are enabled by default under Google Consent Mode. In the EU/UK and other regions, analytics stay
		off until you opt in through our cookie banner. You can review or change your choices at any time
		via <strong>“Cookie settings”</strong> in the site footer.
	</p>

	<h2>4. How we protect your identity in analytics</h2>
	<p>
		Before any identifier reaches our analytics providers, we replace your account ID with a one-way
		hash generated using a secret key. Analytics providers receive this pseudonymous value, not your
		raw account identity.
	</p>

	<h2>5. Service providers &amp; third parties</h2>
	<ul>
		<li><strong>Google</strong> (Analytics 4 / Tag Manager) — usage analytics.</li>
		<li><strong>Hotjar</strong> — product/behavior analytics.</li>
		<li>
			<strong>Stripe</strong> (US) and <strong>Lemon Squeezy</strong> (international, as Merchant of
			Record) — payment processing. Card details go directly to the processor; we never see or store
			full card numbers.
		</li>
		<li><strong>Content &amp; email platforms</strong> (self-hosted CMS and email/marketing) — to serve site content and send communications.</li>
		<li>
			<strong>Anthropic</strong> — AI/language-model processing for the compliance assistant. Chat
			messages are processed to generate responses but are not retained beyond the session, per
			Anthropic’s API data-handling policy. <strong>We do not use your sales data to train AI
			models.</strong> See
			<a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener">Anthropic’s Privacy Policy</a>.
		</li>
	</ul>

	<h2>6. Data retention</h2>
	<p>
		Account data is kept while your account is active. If you close your account, we delete or
		anonymize your personal information within <strong>90 days</strong>, except where we must retain
		certain records for legal, tax, accounting, or security purposes (such as billing records). Nexus
		assessment inputs are not retained. Analytics data is retained per each provider’s configured
		retention period. You may request deletion at any time (see §8).
	</p>

	<h2>7. International transfers</h2>
	<p>
		The service is operated from, and data is processed in, the United States. If you access it from
		another region, you consent to processing in the United States, where data-protection laws may
		differ from those in your jurisdiction.
	</p>

	<h2>8. Your rights &amp; choices</h2>
	<ul>
		<li>Withdraw or change analytics consent anytime via “Cookie settings”.</li>
		<li>
			Depending on your location, you may have rights to access, correct, delete, or export your
			data, and to opt out of “sale”/“sharing” for cross-context advertising (we do not sell personal
			data).
		</li>
	</ul>
	<p>
		<strong>California residents (CCPA/CPRA).</strong> You have the rights to know, delete, correct, and
		opt out of the sale or sharing of personal information. We do not sell or share personal information
		as those terms are defined by the CCPA/CPRA, and we will not discriminate against you for exercising
		your rights.
	</p>
	<p>
		<strong>EEA/UK residents (GDPR/UK GDPR).</strong> We process your data on the legal bases of
		contract performance (providing the service), legitimate interests (security and product
		improvement), and consent (analytics and marketing). You may lodge a complaint with your local
		supervisory authority.
	</p>
	<p>
		To exercise any right, contact us at <a href={'mailto:' + contactEmail}>{contactEmail}</a>. We will
		respond within the timeframe required by applicable law.
	</p>

	<h2>9. Security</h2>
	<p>
		We use industry-standard measures (encryption in transit, access controls, minimized data
		collection). No method of transmission or storage is perfectly secure.
	</p>

	<h2>10. Children</h2>
	<p>The service is intended for business use by adults and is not directed to anyone under 18.</p>

	<h2>11. Changes to this policy</h2>
	<p>
		We may update this policy; material changes will be reflected by the “Effective date” above and,
		where appropriate, additional notice.
	</p>

	<h2>12. Contact</h2>
	<p>Questions or requests: <a href={'mailto:' + contactEmail}>{contactEmail}</a>.</p>
	<p>Consult Solutions — Oakland, California.</p>
</article>
