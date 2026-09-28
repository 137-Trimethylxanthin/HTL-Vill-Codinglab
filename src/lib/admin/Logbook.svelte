<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { recordsCsv } from '$lib/history/csv';
	import { logbook, type Logbook } from '$lib/history/stats';
	import type { PeerInfo, SessionRecord } from '$lib/history/types';
	import { t } from '$lib/i18n/de';
	import { PlatformError, type Platform } from '$lib/platform/types';

	let { platform, pin }: { platform: Platform; pin: string } = $props();

	let records = $state<SessionRecord[]>([]);
	let peers = $state<PeerInfo[]>([]);
	let status = $state<string | null>(null);
	let confirmDelete = $state(false);
	const log = $derived<Logbook>(logbook(records));

	async function refresh() {
		records = await platform.listRecords().catch(() => []);
		peers = await platform.peers().catch(() => []);
	}

	onMount(() => {
		void refresh();
		const timer = setInterval(() => void refresh(), 10_000);
		return () => clearInterval(timer);
	});

	const message = (e: unknown) => (e instanceof PlatformError ? e.message : String(e));

	async function exportCsv() {
		try {
			const path = await platform.saveTextFile(pin, 'codinglab-logbuch.csv', recordsCsv(records));
			if (path) status = t.admin.exported(path);
		} catch (e) {
			status = message(e);
		}
	}

	async function deleteAll() {
		if (!confirmDelete) {
			confirmDelete = true;
			status = t.logbook.deleteConfirm;
			return;
		}
		confirmDelete = false;
		try {
			status = t.logbook.deleted(await platform.deleteHistory(pin));
			await refresh();
		} catch (e) {
			status = message(e);
		}
	}
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-2xl font-bold">{t.logbook.title}</h2>
	{#if status}<p class="rounded-xl bg-muted px-4 py-3">{status}</p>{/if}
	<p class="text-lg">{t.logbook.visitors(log.visitors, log.finished)}</p>
	<div class="grid grid-cols-2 gap-4">
		<div>
			<h3 class="font-bold">{t.logbook.perDay}</h3>
			<ul>
				{#each log.perDay.slice(0, 10) as d (d.day)}<li>
						{d.day}: {d.visitors} ({d.finished})
					</li>{/each}
			</ul>
		</div>
		<div>
			<h3 class="font-bold">{t.logbook.perYear}</h3>
			<ul>
				{#each log.perYear as y (y.year)}<li>{y.year}: {y.visitors}</li>{/each}
			</ul>
		</div>
	</div>
	<div>
		<h3 class="font-bold">{t.logbook.perMission}</h3>
		<ul>
			{#each log.perMission as m (m.id)}<li>{t.logbook.missionRow(m)}</li>{/each}
		</ul>
	</div>
	<div>
		<h3 class="font-bold">{t.logbook.dropOff}</h3>
		<ul>
			{#each log.dropOff as d (d.mission)}<li>{d.mission}: {d.count}</li>{/each}
		</ul>
	</div>
	<div>
		<h3 class="font-bold">{t.logbook.peers}</h3>
		{#if peers.length === 0}<p class="text-muted-foreground">{t.logbook.noPeers}</p>{/if}
		<ul>
			{#each peers as p (p.station)}
				<li>
					{t.logbook.peerRow(
						p.name,
						p.address,
						p.lastOkMs !== null && Date.now() - p.lastOkMs < 90_000
					)}
				</li>
			{/each}
		</ul>
	</div>
	<div class="flex gap-3">
		<Button variant="secondary" class="h-12 rounded-xl px-6" onclick={exportCsv}
			>{t.logbook.export}</Button
		>
		<Button variant="destructive" class="h-12 rounded-xl px-6" onclick={deleteAll}
			>{t.logbook.delete}</Button
		>
	</div>
</section>
