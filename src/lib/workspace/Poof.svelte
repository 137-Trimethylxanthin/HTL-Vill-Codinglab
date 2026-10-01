<script lang="ts">
	/** A block thrown away bursts into a few pieces of its colour. */
	let { x, y, color }: { x: number; y: number; color: string } = $props();
	const pieces = Array.from({ length: 10 }, (_, i) => {
		const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
		const dist = 40 + Math.random() * 40;
		return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 8 + Math.random() * 10 };
	});
</script>

<div class="pointer-events-none fixed z-50" style:left="{x}px" style:top="{y}px">
	{#each pieces as p, i (i)}
		<span
			class="poof absolute rounded-md"
			style:width="{p.size}px"
			style:height="{p.size}px"
			style:background={color}
			style:--dx="{p.dx}px"
			style:--dy="{p.dy}px"
		></span>
	{/each}
</div>

<style>
	.poof {
		translate: -50% -50%;
		animation: poof 500ms cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
	}
	@keyframes poof {
		to {
			transform: translate(var(--dx), var(--dy)) scale(0.2) rotate(120deg);
			opacity: 0;
		}
	}
</style>
