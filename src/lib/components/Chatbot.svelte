<script lang="ts">
	/**
	 * TaxNexus compliance assistant widget (Svelte 5 runes, DaisyUI).
	 *
	 * Fixed bottom-right launcher → floating chat panel. Streams token-by-token
	 * from /api/chat. Five UI states: idle / composing / streaming / error /
	 * rate-limited. Never renders message content as HTML.
	 */
	import { tick } from 'svelte';
	import { chatStore } from '$lib/stores/chat.svelte';

	interface Props {
		/** Whether a Better Auth session is present. */
		authenticated?: boolean;
		/** Subscription tier for signed-in users (display only). */
		tier?: string | null;
		/** Current auth user id (or null for guests) — drives transcript reset. */
		userId?: string | null;
	}

	let { authenticated = false, tier = null, userId = null }: Props = $props();

	// TaxNexus brand palette.
	const NAVY = '#0D1B2A';
	const AMBER = '#F0A500';

	// Single source for the rate-limit copy so the screen-reader announcement and
	// the visible alert never drift.
	const RATE_LIMIT_MSG = 'Message limit reached. Please wait a moment before retrying.';

	type Status = 'idle' | 'composing' | 'streaming' | 'error' | 'rate-limited';

	let open = $state(false);
	let input = $state('');
	let status = $state<Status>('idle');
	let errorMsg = $state('');
	let alertDismissed = $state(false);
	let scroller = $state<HTMLDivElement | null>(null);
	let textarea = $state<HTMLTextAreaElement | null>(null);

	const messages = $derived(chatStore.messages);
	const isStreaming = $derived(status === 'streaming');
	const alertVisible = $derived(
		(status === 'error' || status === 'rate-limited') && !alertDismissed
	);

	// Content-free announcement for assistive tech.
	const liveMessage = $derived.by(() => {
		if (status === 'streaming') return 'Assistant is responding.';
		if (status === 'rate-limited') return RATE_LIMIT_MSG;
		if (status === 'error') return errorMsg || 'Something went wrong.';
		return '';
	});

	// Reset the transcript whenever the auth user changes.
	$effect(() => {
		chatStore.syncUser(userId);
	});

	async function scrollToEnd() {
		await tick();
		if (scroller) scroller.scrollTop = scroller.scrollHeight;
	}

	function toggle() {
		open = !open;
		if (open) {
			alertDismissed = false;
			scrollToEnd();
			tick().then(() => textarea?.focus());
		}
	}

	function closeWidget() {
		open = false;
	}

	function onInput() {
		if (status === 'idle' || status === 'composing') {
			status = input.trim() ? 'composing' : 'idle';
		}
	}

	function onTextareaKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			void send();
		}
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			closeWidget();
		}
	}

	function dismissAlert() {
		alertDismissed = true;
		if (status === 'error' || status === 'rate-limited') status = 'idle';
	}

	function snoozeAlert() {
		// Snooze collapses the widget and clears the transient alert state.
		alertDismissed = true;
		status = 'idle';
		open = false;
	}

	// The server marks a mid-stream failure with a single null byte (one byte, so it
	// can never split across chunks and never appears in normal model output).
	const ERROR_SENTINEL = '\u0000';

	/** Stream a completion into an existing assistant message id. Shared by send + retry. */
	async function runCompletion(assistantId: string) {
		status = 'streaming';
		errorMsg = '';
		alertDismissed = false;

		// Sliding window: last 10, excluding errored/empty placeholders.
		const payload = chatStore
			.getRecent(10)
			.filter((m) => !m.error && m.content.trim().length > 0)
			.map((m) => ({ role: m.role, content: m.content }));

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ messages: payload })
			});

			// 429 covers both our own rate limit and an upstream "busy" (Anthropic 429).
			if (res.status === 429) {
				chatStore.markError(assistantId);
				status = 'rate-limited';
				return;
			}
			if (!res.ok || !res.body) {
				throw new Error(`bad_response_${res.status}`);
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let interrupted = false;
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				let text = decoder.decode(value, { stream: true });
				if (text.includes(ERROR_SENTINEL)) {
					// Mid-stream failure: keep any partial text, then surface the error.
					text = text.replaceAll(ERROR_SENTINEL, '');
					if (text) chatStore.appendContent(assistantId, text);
					interrupted = true;
					break;
				}
				chatStore.appendContent(assistantId, text);
				await scrollToEnd();
			}

			if (interrupted) {
				chatStore.markError(assistantId);
				errorMsg = 'The response was interrupted before it finished.';
				status = 'error';
			} else {
				chatStore.save();
				status = 'idle';
			}
		} catch {
			chatStore.markError(assistantId);
			errorMsg = 'Something went wrong. Please try again.';
			status = 'error';
		}
	}

	async function send() {
		const text = input.trim();
		if (!text || isStreaming) return;
		input = '';

		// Optimistic: user message shows immediately, assistant placeholder streams in.
		chatStore.addMessage({ role: 'user', content: text });
		const assistant = chatStore.addMessage({ role: 'assistant', content: '' });
		await scrollToEnd();
		await runCompletion(assistant.id);
	}

	/** Re-run the last failed turn: the errored assistant placeholder is the last message. */
	async function retry() {
		if (isStreaming) return;
		const msgs = chatStore.messages;
		const last = msgs[msgs.length - 1];
		if (!last || last.role !== 'assistant') return;
		chatStore.resetForRetry(last.id);
		await scrollToEnd();
		await runCompletion(last.id);
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<!-- Floating launcher -->
<button
	type="button"
	data-testid="chat-launcher"
	class="btn btn-circle fixed right-6 bottom-6 z-50 h-14 w-14 border-0 shadow-lg"
	style="background-color: {AMBER}; color: {NAVY};"
	aria-label={open ? 'Close compliance assistant' : 'Open compliance assistant'}
	aria-expanded={open}
	onclick={toggle}
>
	{#if open}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
			<path d="M18 6 6 18M6 6l12 12" />
		</svg>
	{:else}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
		</svg>
	{/if}
</button>

{#if open}
	<div
		class="card fixed right-6 bottom-24 z-50 flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden bg-white shadow-2xl"
		role="dialog"
		aria-modal="false"
		aria-label="California nexus compliance assistant"
	>
		<!-- Header -->
		<header class="flex items-center justify-between px-4 py-3" style="background-color: {NAVY};">
			<div class="flex flex-col">
				<span class="text-sm font-semibold" style="color: {AMBER};">Nexus Compliance Assistant</span>
				<span class="text-xs text-white/70">California sales-tax guidance</span>
			</div>
			<button
				type="button"
				class="btn btn-ghost btn-sm btn-circle text-white"
				aria-label="Close"
				onclick={closeWidget}
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
					<path d="M18 6 6 18M6 6l12 12" />
				</svg>
			</button>
		</header>

		{#if !authenticated}
			<div class="bg-base-200 px-4 py-2 text-xs text-base-content/80">
				<a href="/login" class="link font-medium" style="color: {NAVY};">Sign in</a>
				for personalized compliance guidance.
			</div>
		{:else if tier}
			<div class="bg-base-200 px-4 py-1.5 text-[0.7rem] text-base-content/70">
				Signed in · <span class="font-medium capitalize">{tier}</span> plan
			</div>
		{/if}

		<!-- Messages -->
		<div bind:this={scroller} class="flex-1 space-y-2 overflow-y-auto px-3 py-3">
			{#if messages.length === 0}
				<p class="mt-6 px-3 text-center text-sm text-base-content/60">
					Ask about California warehouse presence, sales thresholds, or filing obligations for your
					FBA business.
				</p>
			{/if}
			{#each messages as message (message.id)}
				<div class="chat {message.role === 'user' ? 'chat-end' : 'chat-start'}">
					<div
						data-testid="chat-bubble"
						class="chat-bubble text-sm whitespace-pre-wrap"
						class:chat-bubble-error={message.error}
						style={message.role === 'user' && !message.error
							? `background-color: ${NAVY}; color: #fff;`
							: ''}
					>
						{#if message.content}
							{message.content}
						{:else if isStreaming}
							<span class="loading loading-dots loading-sm" aria-hidden="true"></span>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Transient alerts -->
		{#if alertVisible}
			<div
				class="alert {status === 'rate-limited' ? 'alert-warning' : 'alert-error'} m-2 flex items-center justify-between gap-2 py-2 text-xs"
				role="alert"
			>
				<span>
					{status === 'rate-limited' ? RATE_LIMIT_MSG : errorMsg}
				</span>
				<span class="flex gap-1">
					{#if status === 'error'}
						<button
							type="button"
							data-testid="chat-retry"
							class="btn btn-xs border-0"
							style="background-color: {AMBER}; color: {NAVY};"
							onclick={retry}>Retry</button
						>
					{/if}
					<button type="button" class="btn btn-ghost btn-xs" onclick={snoozeAlert}>Snooze</button>
					<button type="button" class="btn btn-ghost btn-xs" onclick={dismissAlert}>Dismiss</button>
				</span>
			</div>
		{/if}

		<!-- Composer -->
		<footer class="border-base-200 flex items-end gap-2 border-t p-2">
			<textarea
				bind:this={textarea}
				bind:value={input}
				data-testid="chat-input"
				class="input input-bordered h-10 max-h-28 min-h-10 flex-1 resize-none py-2 text-sm leading-tight"
				placeholder="Type your question…  (Enter to send)"
				rows="1"
				disabled={isStreaming}
				aria-label="Message"
				oninput={onInput}
				onkeydown={onTextareaKeydown}
			></textarea>
			<button
				type="button"
				data-testid="chat-send"
				class="btn btn-circle border-0"
				style="background-color: {AMBER}; color: {NAVY};"
				aria-label="Send message"
				disabled={isStreaming || input.trim().length === 0}
				onclick={send}
			>
				{#if isStreaming}
					<span class="loading loading-spinner loading-sm"></span>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
					</svg>
				{/if}
			</button>
		</footer>

		<!-- Screen-reader live region -->
		<div class="sr-only" role="status" aria-live="polite">{liveMessage}</div>
	</div>
{/if}
