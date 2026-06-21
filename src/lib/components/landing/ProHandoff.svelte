<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
</script>

<!-- §6 WHEN YOU NEED A PRO — olive-deep band (accent) -->
<section class="bg-accent text-accent-content" aria-labelledby="home-pro-heading">
	<div class="mx-auto max-w-2xl px-4 py-16 md:py-24">
		<p
			class="mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-accent-content/70"
		>
			{m.home_pro_eyebrow()}
			<span class="h-px max-w-[5rem] flex-1 bg-accent-content/20"></span>
		</p>
		<h2 id="home-pro-heading" class="text-3xl font-semibold tracking-tight text-accent-content md:text-4xl">
			{m.home_pro_heading()}
		</h2>

		<p class="mt-6">{m.home_pro_p1()}</p>
		<p class="mt-4">{m.home_pro_p2()}</p>
		<p class="mt-4">{m.home_pro_p3()}</p>
		<p class="mt-4">{m.home_pro_p4()}</p>
		<p class="mt-4">{m.home_pro_p5()}</p>
	</div>
</section>
