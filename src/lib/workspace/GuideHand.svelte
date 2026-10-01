<script lang="ts">
	import { Pointer } from '@lucide/svelte';
	import { t } from '$lib/i18n/de';
	import type { GuideStep } from './guide';

	/**
	 * An animated hand that shows the next move: drag a block over, tap +, tap Start.
	 * It waits until the screen has been calm for a moment, so it never gets in the way.
	 */
	let { step }: { step: GuideStep } = $props();

	type Spot = { x: number; y: number };
	let from = $state<Spot | null>(null);
	let to = $state<Spot | null>(null);
	let visible = $state(false);

	const centre = (el: Element | null): Spot | null => {
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
	};

	const onScreen = (p: Spot) => p.x >= 0 && p.y >= 0 && p.x <= innerWidth && p.y <= innerHeight;

	function measure(s: GuideStep) {
		if (s.kind === 'add') {
			from = centre(document.querySelector(`[data-palette="${s.type}"]`));
			const list = document.querySelector('[data-drop-scroll]')?.getBoundingClientRect();
			// The list is hidden (Python tab on a phone) or the tile scrolled away: no hand.
			if (!from || !list?.width || !onScreen(from)) {
				from = to = null;
				return;
			}
			const blocks = document.querySelectorAll('[data-drop-scroll] > ol > li[data-block-id]');
			const r = blocks[blocks.length - 1]?.getBoundingClientRect();
			to = {
				x: list.left + list.width / 2,
				y: Math.min(r ? r.bottom + 34 : list.top + 40, list.bottom - 20)
			};
		} else {
			const label = s.kind === 'start' ? null : s.delta > 0 ? t.workspace.more : t.workspace.less;
			const el =
				s.kind === 'start'
					? document.querySelector('[data-start]')
					: document.querySelector(`[data-block-id="${s.id}"] button[aria-label="${label}"]`);
			from = null;
			to = centre(el);
			if (to && !onScreen(to)) to = null;
		}
	}

	$effect(() => {
		const s = step;
		visible = false;
		// Wait for the screen to settle (landing animations), then show the hand.
		const show = setTimeout(() => {
			measure(s);
			visible = true;
		}, 1200);
		const follow = setInterval(() => visible && measure(s), 700);
		return () => {
			clearTimeout(show);
			clearInterval(follow);
		};
	});
</script>

{#if visible && to}
	<div
		class="pointer-events-none fixed inset-0 z-40"
		style:--fx="{(from ?? to).x}px"
		style:--fy="{(from ?? to).y}px"
		style:--tx="{to.x}px"
		style:--ty="{to.y}px"
	>
		<div class={from ? 'hand drag' : 'hand tap'}>
			<span class="ring"></span>
			<Pointer class="size-16 fill-white stroke-slate-800 drop-shadow-lg" stroke-width={1.5} />
		</div>
	</div>
{/if}

<style>
	.hand {
		position: absolute;
		left: 0;
		top: 0;
		/* The fingertip of the icon sits near its top-left third. */
		margin: -6px 0 0 -22px;
	}
	.ring {
		position: absolute;
		left: 10px;
		top: -6px;
		width: 28px;
		height: 28px;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.8);
		opacity: 0;
	}
	.drag {
		animation: drag 2.4s ease-in-out infinite;
	}
	.drag .ring {
		animation: press 2.4s ease-in-out infinite;
	}
	.tap {
		transform: translate(var(--tx), var(--ty));
		animation: tap 1.4s ease-in-out infinite;
	}
	.tap .ring {
		animation: ripple 1.4s ease-out infinite;
	}
	@keyframes drag {
		0% {
			transform: translate(var(--fx), var(--fy)) scale(1);
			opacity: 0;
		}
		10% {
			transform: translate(var(--fx), var(--fy)) scale(1);
			opacity: 1;
		}
		20% {
			transform: translate(var(--fx), var(--fy)) scale(0.9);
		}
		70% {
			transform: translate(var(--tx), var(--ty)) scale(0.9);
			opacity: 1;
		}
		80% {
			transform: translate(var(--tx), var(--ty)) scale(1);
		}
		100% {
			transform: translate(var(--tx), var(--ty)) scale(1);
			opacity: 0;
		}
	}
	@keyframes press {
		0%,
		15% {
			opacity: 0;
			scale: 0.5;
		}
		22%,
		70% {
			opacity: 1;
			scale: 1;
		}
		80%,
		100% {
			opacity: 0;
		}
	}
	@keyframes tap {
		0%,
		100% {
			translate: 0 0;
		}
		40% {
			translate: 0 -14px;
		}
		55% {
			translate: 0 0;
		}
	}
	@keyframes ripple {
		50% {
			opacity: 0;
			scale: 0.5;
		}
		60% {
			opacity: 1;
			scale: 0.8;
		}
		100% {
			opacity: 0;
			scale: 2.2;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.drag,
		.drag .ring,
		.tap,
		.tap .ring {
			animation: none;
		}
		.drag {
			transform: translate(var(--tx), var(--ty));
		}
	}
</style>
