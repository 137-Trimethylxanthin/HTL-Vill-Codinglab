<script lang="ts">
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';

	let { failed = false }: { failed?: boolean } = $props();
	const ROTORS = [
		[-24, -24],
		[24, -24],
		[-24, 24],
		[24, 24]
	];
</script>

<main class="grid h-full place-items-center bg-sky p-6" role="status">
	<div class="flex flex-col items-center gap-6 text-center">
		<svg viewBox="-60 -60 120 120" class="hover size-48" role="img" aria-label={t.app.drone}>
			<rect
				x="-6"
				y="-34"
				width="12"
				height="68"
				rx="6"
				class="fill-slate-800"
				transform="rotate(45)"
			/>
			<rect
				x="-6"
				y="-34"
				width="12"
				height="68"
				rx="6"
				class="fill-slate-800"
				transform="rotate(-45)"
			/>
			{#each ROTORS as [px, py] (px + ',' + py)}
				<g transform="translate({px} {py})">
					<circle r="15" class="fill-slate-300/70" />
					<rect x="-14" y="-2" width="28" height="4" rx="2" class="spin fill-slate-700" />
				</g>
			{/each}
			<rect x="-16" y="-16" width="32" height="32" rx="10" class="fill-drone" />
			<circle cx="0" cy="-10" r="4" class="fill-white" />
		</svg>
		<p class="text-xl font-bold tracking-widest text-htl uppercase">{t.attract.school}</p>
		<h1 class="font-display text-5xl font-bold">{t.app.name}</h1>
		<p
			class={cn(
				'max-w-md font-display text-2xl font-bold',
				failed ? 'text-destructive' : 'animate-pulse'
			)}
		>
			{failed ? t.app.loadFailed : t.app.loading}
		</p>
	</div>
</main>

<style>
	.spin {
		animation: spin 0.18s linear infinite;
		transform-box: fill-box;
		transform-origin: center;
	}
	.hover {
		animation: hover 2.4s ease-in-out infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes hover {
		50% {
			transform: translateY(-12px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spin,
		.hover {
			animation: none;
		}
	}
</style>
