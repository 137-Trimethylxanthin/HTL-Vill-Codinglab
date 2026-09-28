<script lang="ts">
	import { Check } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from '$lib/i18n/de';
	import { isValidEmail } from '$lib/platform/data';
	import { cn } from '$lib/utils';
	import OnScreenKeyboard from './OnScreenKeyboard.svelte';

	let {
		busy,
		error,
		onSend,
		onCancel
	}: {
		busy: boolean;
		error: string | null;
		onSend: (email: string, consent: boolean) => void;
		onCancel: () => void;
	} = $props();

	let email = $state('');
	let consent = $state(false);
	const valid = $derived(isValidEmail(email));
</script>

<div class="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-slate-900/60 p-6">
	<div class="flex flex-col items-center gap-5 rounded-3xl bg-card p-8 shadow-2xl">
		<h2 class="text-4xl font-bold">{t.email.title}</h2>
		<div
			class="min-h-16 w-full min-w-[min(36rem,90vw)] rounded-2xl bg-muted px-6 py-3 text-center font-mono text-3xl"
		>
			{email || ' '}
		</div>
		<OnScreenKeyboard
			value={email}
			mode="email"
			onChange={(v) => (email = v)}
			onDone={() => valid && !busy && onSend(email, consent)}
		/>
		<button
			class="flex min-h-14 press items-center gap-4 rounded-2xl px-4 text-left text-xl"
			role="checkbox"
			aria-checked={consent}
			onclick={() => (consent = !consent)}
		>
			<span
				class={cn(
					'grid size-10 shrink-0 place-items-center rounded-xl border-4',
					consent ? 'border-success bg-success text-white' : 'border-muted-foreground/40'
				)}
				>{#if consent}<Check class="size-7" />{/if}</span
			>
			{t.email.consent}
		</button>
		{#if error}<p class="text-lg font-bold text-destructive">{error}</p>{/if}
		{#if email && !valid}<p class="text-lg text-muted-foreground">{t.email.invalid}</p>{/if}
		<div class="flex gap-4">
			<Button
				variant="secondary"
				class="h-16 press rounded-2xl px-8 text-xl"
				disabled={busy}
				onclick={onCancel}>{t.email.cancel}</Button
			>
			<Button
				class="h-16 press rounded-2xl bg-drone px-10 text-2xl font-bold text-drone-foreground"
				disabled={!valid || busy}
				onclick={() => onSend(email, consent)}>{busy ? t.email.sending : t.email.send}</Button
			>
		</div>
	</div>
</div>
