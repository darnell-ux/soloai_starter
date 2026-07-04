<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';

	export const prerender = true;

	// NOTE (for the operator): technical draft aligned to current behavior; not legal
	// advice. Have counsel review and set the entity name, governing jurisdiction, and
	// refund/cancellation specifics before launch.
	const lastUpdated = 'July 4, 2026';
	const contactEmail = 'support@taxnexusapp.com';
</script>

<SeoHead
	pageTitle="Terms of Service"
	description="The terms governing access to and use of TaxNexus, including subscriptions and important disclaimers."
/>

<article class="prose prose-sm mx-auto max-w-3xl px-4 py-10">
	<h1>Terms of Service</h1>
	<p><em>Last updated: {lastUpdated}</em></p>

	<h2>1. Agreement</h2>
	<p>
		TaxNexus is operated by Consult Solutions, an Oakland, California company (“we”, “us”, “our”).
		By accessing or using TaxNexus (the “Service”), you agree to these Terms. If you do not agree, do
		not use the Service.
	</p>

	<h2>2. The Service — informational only, not professional advice</h2>
	<p>
		The Service provides tools and guidance to help Amazon FBA sellers understand potential California
		sales-tax nexus exposure, including automated estimates and an AI assistant.
		<strong>
			The Service is for general informational purposes only and does not constitute tax, legal, or
			accounting advice.
		</strong>
		Estimates and AI responses may be incomplete or inaccurate for your situation. Always consult a
		qualified tax professional before making filing or compliance decisions.
	</p>

	<h2>3. Accounts</h2>
	<p>
		You are responsible for the accuracy of your account information and for safeguarding your
		credentials and all activity under your account.
	</p>

	<h2>4. Subscriptions &amp; billing</h2>
	<ul>
		<li>
			Paid plans are billed through <strong>Stripe</strong> (United States) or
			<strong>Lemon Squeezy</strong> (international, acting as Merchant of Record). Applicable taxes are
			handled by the processor at checkout.
		</li>
		<li>
			Subscriptions renew automatically for the stated interval until cancelled. You can cancel at any
			time from your account; access continues through the end of the paid period.
		</li>
		<li>Prices shown in-app are indicative; the exact amount and currency are confirmed at checkout.</li>
		<li>Refunds are governed by applicable law and the processor’s terms.</li>
	</ul>

	<h2>5. Acceptable use</h2>
	<p>
		Do not misuse the Service — including attempting to disrupt it, access it without authorization,
		scrape it at scale, or use it to violate any law or third-party right.
	</p>

	<h2>6. Intellectual property</h2>
	<p>
		The Service, its content, and software are owned by us or our licensors and are protected by
		applicable law. We grant you a limited, non-exclusive, non-transferable right to use the Service in
		accordance with these Terms.
	</p>

	<h2>7. Third-party services</h2>
	<p>
		The Service integrates third parties (e.g., payment processors, analytics, content platforms). Your
		use of those services may be subject to their own terms and privacy practices.
	</p>

	<h2>8. Disclaimers</h2>
	<p>
		The Service is provided “as is” and “as available”, without warranties of any kind, including
		accuracy, fitness for a particular purpose, or non-infringement. We do not warrant that estimates
		or AI outputs are correct or complete.
	</p>

	<h2>9. Limitation of liability</h2>
	<p>
		To the maximum extent permitted by law, we are not liable for indirect, incidental, special,
		consequential, or punitive damages, or for any tax, penalty, or loss arising from reliance on the
		Service. Consult a professional for decisions with legal or financial consequences.
	</p>

	<h2>10. Changes</h2>
	<p>
		We may update these Terms; material changes are reflected by the “Last updated” date above.
		Continued use after changes constitutes acceptance.
	</p>

	<h2>11. Governing law</h2>
	<p>
		These Terms are governed by the laws of the State of California, without regard to
		conflict-of-laws rules. Any disputes arising from or relating to these Terms or the Service shall
		be subject to the exclusive jurisdiction of the state and federal courts located in Alameda County,
		California, and you consent to personal jurisdiction in those courts.
	</p>

	<h2>12. Contact</h2>
	<p>Questions: <a href={'mailto:' + contactEmail}>{contactEmail}</a>.</p>
</article>
