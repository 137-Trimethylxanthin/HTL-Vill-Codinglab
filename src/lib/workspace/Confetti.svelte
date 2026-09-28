<script lang="ts">
	const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899'];
	const pieces = Array.from({ length: 36 }, (_, i) => ({
		left: Math.random() * 100,
		dx: (Math.random() - 0.5) * 200,
		rot: Math.random() * 720 - 360,
		delay: Math.random() * 250,
		color: COLORS[i % COLORS.length],
		size: 8 + Math.random() * 8
	}));
</script>

<div class="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
	{#each pieces as p, i (i)}
		<span
			class="piece absolute -top-4 rounded-sm"
			style:left="{p.left}%"
			style:width="{p.size}px"
			style:height="{p.size * 0.5}px"
			style:background={p.color}
			style:--dx="{p.dx}px"
			style:--rot="{p.rot}deg"
			style:animation-delay="{p.delay}ms"
		></span>
	{/each}
</div>

<style>
	.piece {
		animation: fall 1.5s cubic-bezier(0.2, 0.7, 0.4, 1) both;
	}
	@keyframes fall {
		from {
			transform: translate(0, 0) rotate(0);
			opacity: 1;
		}
		to {
			transform: translate(var(--dx), 620px) rotate(var(--rot));
			opacity: 0;
		}
	}
</style>
