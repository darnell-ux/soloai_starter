<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
</script>

<!-- Top document rail — the dossier "file header" strip. -->
<div class="border-b border-base-300 bg-base-100">
	<div
		class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-muted"
	>
		<span><b class="font-semibold text-accent">{m.home_rail_org()}</b> · {m.home_rail_label()}</span>
		<span>{m.home_rail_file()}</span>
		<span>{m.home_rail_rev()}</span>
	</div>
</div>
