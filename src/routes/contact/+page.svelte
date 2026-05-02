<script lang="ts">
	import { enhance } from '$app/forms';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<SeoHead
	pageTitle="Contact"
	description="Reach our team for sales, support, and general inquiries."
/>

<main class="mx-auto max-w-lg px-4 py-10">
	<h1 class="text-3xl font-bold tracking-tight">Contact</h1>
	<p class="mt-2 text-base-content/80">
		Send a message. Marketing email is opt-in only and processed server-side.
	</p>

	<form method="POST" action="?/default" class="mt-8 space-y-4" use:enhance>
		<div class="form-control w-full">
			<label class="label" for="contact-email"><span class="label-text">Email</span></label>
			<input
				id="contact-email"
				name="email"
				type="email"
				autocomplete="email"
				class="input input-bordered w-full"
				required
			/>
		</div>
		<div class="form-control w-full">
			<label class="label" for="contact-message"><span class="label-text">Message</span></label>
			<textarea
				id="contact-message"
				name="message"
				class="textarea textarea-bordered w-full min-h-32"
				required
				maxlength="4000"
			></textarea>
		</div>
		<div class="form-control">
			<label class="label cursor-pointer justify-start gap-3">
				<input type="checkbox" name="marketingOptIn" class="checkbox checkbox-sm" />
				<span class="label-text">I agree to receive marketing emails (optional)</span>
			</label>
		</div>
		{#if form?.contactOk}
			<p class="text-success text-sm" role="status">Message received.</p>
		{/if}
		{#if form?.contactError}
			<p class="text-error text-sm" role="alert">Please check your input.</p>
		{/if}
		<button type="submit" class="btn btn-primary">Send</button>
	</form>
</main>
