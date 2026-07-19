<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';

	export const prerender = true;

	// NOTE (for the operator): technical draft aligned to current billing behavior;
	// not legal advice. Have counsel review before launch.
	const effectiveDate = 'July 18, 2026';
	const contactEmail = 'support@taxnexusapp.com';
</script>

<SeoHead
	pageTitle="Refund Policy"
	description="TaxNexus refund policy — 14-day free trial, a money-back guarantee on your first payment, and how renewals and Lemon Squeezy purchases are handled."
/>

<article class="prose prose-sm mx-auto max-w-3xl px-4 py-10">
	<h1>Refund Policy</h1>
	<p><em>Effective date: {effectiveDate}</em></p>

	<p>
		We want you to be confident in TaxNexus before you ever pay for it — that’s why every plan starts
		with a <strong>14-day free trial with no credit card required</strong>. You can evaluate the full
		product before any charge occurs.
	</p>

	<h2>First payment — 14-day money-back guarantee</h2>
	<p>
		If TaxNexus isn’t right for you, we offer a full refund of your <strong>first subscription
		payment</strong> if you request it within <strong>14 days of that first charge</strong>. No forms,
		no hoops — email us at <a href={'mailto:' + contactEmail}>{contactEmail}</a> from the email address
		on your account and we’ll process it.
	</p>
	<p>
		Refunds are issued to the original payment method. Depending on your payment provider, funds
		typically appear within 5–10 business days.
	</p>

	<h2>Renewal payments</h2>
	<p>
		Renewal charges are generally <strong>not refundable</strong>. To avoid an unwanted renewal, cancel
		your subscription from your account settings at any time before your billing date. When you cancel:
	</p>
	<ul>
		<li>No further charges occur.</li>
		<li>You keep full access to the Service through the end of your current billing period.</li>
	</ul>
	<p>
		If you believe a renewal was charged in error (for example, you cancelled before the billing date
		but were still charged), contact us within 14 days of the charge and we will make it right.
	</p>

	<h2>Purchases through Lemon Squeezy</h2>
	<p>
		For purchases where <strong>Lemon Squeezy</strong> acts as merchant of record (international
		customers), refunds are processed through Lemon Squeezy in accordance with this policy. You may
		contact us directly at <a href={'mailto:' + contactEmail}>{contactEmail}</a> and we will coordinate
		the refund on your behalf.
	</p>

	<h2>Exceptions</h2>
	<p>
		We reserve the right to decline refund requests that show signs of abuse, including repeated
		subscribe-refund cycles or violations of our <a href="/terms">Terms of Service</a>.
	</p>

	<h2>Questions</h2>
	<p>
		Anything unclear? Email <a href={'mailto:' + contactEmail}>{contactEmail}</a> — a human (the
		founder, actually) reads every message.
	</p>
</article>
