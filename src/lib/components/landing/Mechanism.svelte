<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
</script>

<!-- §2 THE MECHANISM — two-agency panel -->
<section class="border-y border-base-300 bg-base-200" aria-labelledby="home-mechanism-heading">
	<div class="mx-auto max-w-2xl px-4 py-16 md:py-24">
		<p
			class="mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-secondary"
		>
			{m.home_mechanism_eyebrow()}
			<span class="h-px max-w-[5rem] flex-1 bg-base-300"></span>
		</p>
		<h2
			id="home-mechanism-heading"
			class="text-3xl font-semibold tracking-tight text-accent md:text-4xl"
		>
			{m.home_mechanism_heading()}
		</h2>

		<p class="mt-6 text-base-content">{m.home_mechanism_intro()}</p>
		<p class="mt-4 text-base-content">{m.home_mechanism_p1()}</p>
		<p class="mt-4 text-base-content">{m.home_mechanism_p2()}</p>
		<p class="mt-4 text-base-content">{m.home_mechanism_p3()}</p>

		<div class="my-8 grid grid-cols-1 border-[1.5px] border-secondary bg-base-100 sm:grid-cols-2">
			<div class="border-b-[1.5px] border-secondary p-6 sm:border-b-0 sm:border-r-[1.5px]">
				<p class="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
					{m.home_agencies_ftb_tag()}
				</p>
				<h3 class="mb-1 text-lg font-semibold text-base-content">{m.home_agencies_ftb_name()}</h3>
				<p class="text-[0.98rem] text-base-content">{m.home_agencies_ftb_body()}</p>
			</div>
			<div class="p-6">
				<p class="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
					{m.home_agencies_cdtfa_tag()}
				</p>
				<h3 class="mb-1 text-lg font-semibold text-base-content">{m.home_agencies_cdtfa_name()}</h3>
				<p class="text-[0.98rem] text-base-content">{m.home_agencies_cdtfa_body()}</p>
			</div>
		</div>

		<p class="my-6 border-l-[3px] border-primary pl-5 text-lg font-medium text-accent">
			{m.home_mechanism_callout()}
		</p>
		<p class="mt-4 text-base-content">{m.home_mechanism_p4()}</p>
		<p class="mt-4 text-base-content">{m.home_mechanism_p5()}</p>
		<p class="mt-4 text-base-content">{m.home_mechanism_p6()}</p>
	</div>
</section>
