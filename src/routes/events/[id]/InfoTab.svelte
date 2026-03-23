<script lang="ts">
	type EventInfo = {
		name: string;
		locationLine1: string;
		locationLine2: string;
		date: string;
	};

	let { info }: { info: EventInfo } = $props();
</script>

<div class="space-y-4">
	<div class="rounded-3xl border border-primary p-4">
		<div class="mb-1 text-lg text-muted-foreground">Tournament Name</div>
		<div class="mb-3 text-4xl leading-tight font-semibold">{info.name}</div>
		<div class="mb-6 text-lg text-primary">View on RobotEvents</div>

		<div class="mb-1 text-lg text-muted-foreground">Location</div>
		<div class="text-3xl leading-tight">{info.locationLine1}</div>
		<div class="mb-6 text-3xl text-muted-foreground">{info.locationLine2}</div>

		<div class="mb-1 text-lg text-muted-foreground">Date</div>
		<div class="text-3xl leading-tight">{info.date}</div>
	</div>

	<div class="rounded-3xl border border-border bg-secondary/30 px-5 py-5 text-4xl font-medium">
		Teams
	</div>
	<div class="rounded-3xl border border-border bg-secondary/30 px-5 py-5 text-4xl font-medium">
		Awards
	</div>
</div>
