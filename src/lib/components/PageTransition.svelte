<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		routeKey,
		motionEnabled,
		children
	}: {
		routeKey: string;
		motionEnabled: boolean;
		children: Snippet;
	} = $props();

	const durationIn = $derived(motionEnabled ? 260 : 0);
	const durationOut = $derived(motionEnabled ? 200 : 0);
	const slidePx = $derived(motionEnabled ? 10 : 0);
</script>

{#key routeKey}
	<div
		class="page-transition-root min-h-0 flex-1 flex flex-col"
		in:fly={{ y: slidePx, duration: durationIn, opacity: 0, easing: cubicOut }}
		out:fly={{ y: -Math.round(slidePx / 2), duration: durationOut, opacity: 0, easing: cubicOut }}
	>
		{@render children()}
	</div>
{/key}
