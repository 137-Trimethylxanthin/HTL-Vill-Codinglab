<script lang="ts">
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';
	import { tokenizeLine, type TokenKind } from './highlight';

	let { code, activeLine }: { code: string; activeLine: number | null } = $props();

	const lines = $derived(code.replace(/\n$/, '').split('\n'));
	const COLORS: Record<TokenKind, string> = {
		keyword: 'text-fuchsia-400',
		call: 'text-sky-300',
		number: 'text-amber-300',
		string: 'text-emerald-300',
		comment: 'text-slate-500',
		text: 'text-slate-100'
	};
</script>

<section class="flex min-h-0 flex-col gap-3">
	<h2 class="text-sm font-bold tracking-wide text-muted-foreground uppercase">
		{t.workspace.python}
	</h2>
	<pre class="min-h-0 overflow-auto rounded-2xl bg-slate-900 p-4 font-mono text-lg leading-8"><code
			>{#each lines as line, i (i)}<div
					class={cn(
						'-mx-2 rounded-lg px-2 transition-colors',
						activeLine === i + 1 && 'bg-drone/40'
					)}><span class="mr-4 inline-block w-6 text-right text-slate-500 select-none">{i + 1}</span
					>{#each tokenizeLine(line) as token, j (j)}<span class={COLORS[token.kind]}
							>{token.text}</span
						>{/each}</div>{/each}</code
		></pre>
</section>
