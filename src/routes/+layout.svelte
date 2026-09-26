<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { dev } from '$app/environment';
	import { UMAMI_HOST_URL, UMAMI_SCRIPT_URL, UMAMI_WEBSITE_ID } from '$lib/analytics';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#if !dev}
		<script
			defer
			src={UMAMI_SCRIPT_URL}
			data-website-id={UMAMI_WEBSITE_ID}
			data-host-url={UMAMI_HOST_URL}
		></script>
	{/if}
</svelte:head>

{@render children?.()}
