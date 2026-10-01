<script lang="ts">
	import { Hand } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';

	let { help, onToggle }: { help: boolean; onToggle: () => void } = $props();
</script>

<!-- Calls a supervisor; the station's status shows it on the supervisors' phones. -->
<Button
	variant={help ? 'default' : 'ghost'}
	class={cn(
		'h-14 min-w-14 shrink-0 press rounded-2xl px-4 text-lg',
		help && 'animate-pulse bg-warn font-bold text-warn-foreground hover:bg-warn'
	)}
	aria-label={help ? t.workspace.helpComing : t.workspace.help}
	aria-pressed={help}
	onclick={() => onToggle()}
	><Hand class="size-7" /><span class="max-md:hidden"
		>{help ? t.workspace.helpComing : t.workspace.help}</span
	></Button
>
