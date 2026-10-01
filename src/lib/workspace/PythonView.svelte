<script lang="ts">
	import { Minus, Plus } from '@lucide/svelte';
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';
	import { tokenizeLine, type TokenKind } from './highlight';

	let {
		code,
		activeLine,
		numberTargets = {},
		lineColors = {},
		onNumber
	}: {
		code: string;
		activeLine: number | null;
		numberTargets?: Record<number, string>;
		/** Line number → colour of the block that produced it. */
		lineColors?: Record<number, string>;
		onNumber?: (blockId: string, delta: number) => void;
	} = $props();

	// The block, not the line: adding or moving blocks shifts lines under a selection.
	let selectedId = $state<string | null>(null);
	const selected = $derived.by(() => {
		for (const [line, id] of Object.entries(numberTargets))
			if (id === selectedId) return Number(line);
		return null;
	});
	const lines = $derived(code.replace(/\n$/, '').split('\n'));
	const editable = $derived(onNumber !== undefined);
	const selectedValue = $derived(
		selected === null
			? null
			: (tokenizeLine(lines[selected - 1] ?? '').find((token) => token.kind === 'number')?.text ??
					null)
	);
	const COLORS: Record<TokenKind, string> = {
		keyword: 'text-fuchsia-400',
		call: 'text-sky-300',
		number: 'text-amber-300',
		string: 'text-emerald-300',
		comment: 'text-slate-500',
		text: 'text-slate-100'
	};

	function change(delta: number) {
		if (selectedId && selected !== null) onNumber?.(selectedId, delta);
	}
</script>

<section class="flex min-h-0 flex-1 flex-col gap-3">
	<h2 class="text-sm font-bold tracking-wide text-muted-foreground uppercase">
		{t.workspace.python}
	</h2>
	<pre class="min-h-0 overflow-auto rounded-2xl bg-slate-900 p-4 font-mono text-lg leading-8"><code
			>{#each lines as line, i (i)}<div
					class={cn(
						'-mx-2 rounded-r-lg border-l-4 border-transparent px-2 transition-colors',
						activeLine === i + 1 && 'bg-drone/40'
					)}
					style:border-left-color={lineColors[i + 1]}><span
						class="mr-4 inline-block w-6 text-right text-slate-500 select-none">{i + 1}</span
					>{#each tokenizeLine(line) as token, j (j)}{#if editable && token.kind === 'number' && numberTargets[i + 1]}<button
								class={cn(
									'inline-grid min-h-14 min-w-14 place-items-center rounded-xl bg-amber-300/20 px-2 align-middle text-amber-300 underline decoration-dotted underline-offset-4',
									selected === i + 1 && 'ring-2 ring-amber-300'
								)}
								onclick={() => (selectedId = selected === i + 1 ? null : numberTargets[i + 1])}
								>{token.text}</button
							>{:else}<span class={COLORS[token.kind]}>{token.text}</span
							>{/if}{/each}</div>{/each}</code
		></pre>
	{#if editable}
		{#if selected !== null && numberTargets[selected]}
			<div class="flex items-center justify-center gap-3 rounded-2xl bg-slate-800 p-2">
				<button
					class="grid size-14 press place-items-center rounded-xl bg-slate-700 text-white"
					aria-label={t.workspace.less}
					onclick={() => change(-1)}><Minus class="size-6" /></button
				>
				<span class="w-10 text-center font-mono text-3xl text-amber-300 tabular-nums"
					>{selectedValue}</span
				>
				<button
					class="grid size-14 press place-items-center rounded-xl bg-slate-700 text-white"
					aria-label={t.workspace.more}
					onclick={() => change(1)}><Plus class="size-6" /></button
				>
			</div>
		{:else}
			<p class="text-center text-sm text-muted-foreground">{t.workspace.editNumber}</p>
		{/if}
	{/if}
</section>
