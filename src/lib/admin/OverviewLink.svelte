<script lang="ts">
	import { t } from '$lib/i18n/de';
	import type { Platform, PublicConfig } from '$lib/platform/types';
	import { qrDataUrl } from '$lib/session/qr';

	let {
		platform,
		config
	}: { platform: Pick<Platform, 'features' | 'lanUrls'>; config: PublicConfig } = $props();

	// The server checks the saved settings, so the link follows them (not the unsaved form).
	const ready = $derived(config.syncEnabled && config.eventCode !== '');
	let links = $state<{ url: string; qr: string }[] | null>(null);

	$effect(() => {
		if (!platform.features.overview || !ready) return;
		const code = config.eventCode;
		let alive = true;
		platform
			.lanUrls()
			.catch(() => [])
			.then((bases) =>
				Promise.all(
					bases.map(async (base) => {
						const url = `${base}/overview?code=${encodeURIComponent(code)}`;
						return { url, qr: await qrDataUrl(url) };
					})
				)
			)
			.then((found) => {
				if (alive) links = found;
			});
		return () => (alive = false);
	});
</script>

{#if platform.features.overview}
	<section class="flex flex-col gap-3">
		<h2 class="text-2xl font-bold">{t.supervisor.overview}</h2>
		{#if !ready}
			<p class="font-bold text-warn-foreground">{t.supervisor.overviewNeeds}</p>
		{:else if links}
			<p class="text-lg text-muted-foreground">{t.supervisor.overviewHint}</p>
			{#each links as link (link.url)}
				<div class="flex flex-wrap items-center gap-4 rounded-xl bg-muted p-3">
					<img src={link.qr} alt="" class="size-40 rounded-lg bg-white" />
					<code class="min-w-0 grow text-lg break-all select-text">{link.url}</code>
				</div>
			{:else}
				<p class="font-bold text-warn-foreground">{t.supervisor.overviewNoAddress}</p>
			{/each}
		{/if}
	</section>
{/if}
