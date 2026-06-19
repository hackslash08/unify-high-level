<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, type SyncRun, type SyncError } from "@/lib/api";
import LoadingState from "@/components/LoadingState.vue";
import EmptyState from "@/components/EmptyState.vue";
import Alert from "@/components/ui/Alert.vue";
import Badge from "@/components/ui/Badge.vue";
import Card from "@/components/ui/Card.vue";
import CardContent from "@/components/ui/CardContent.vue";

const syncRuns = ref<SyncRun[]>([]);
const expandedErrors = ref<Record<string, SyncError[]>>({});
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const data = await api.getSyncRuns();
    syncRuns.value = data.syncRuns;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to load sync history";
  } finally {
    loading.value = false;
  }
});

function statusVariant(status: string) {
  if (status === "completed") return "success";
  if (status === "partial") return "warning";
  if (status === "failed") return "destructive";
  return "default";
}

async function toggleErrors(syncRunId: string) {
  if (expandedErrors.value[syncRunId]) {
    delete expandedErrors.value[syncRunId];
    return;
  }
  const { errors } = await api.getSyncErrors(syncRunId);
  expandedErrors.value[syncRunId] = errors;
}
</script>

<template>
  <div>
    <h1 class="mb-2 text-3xl font-bold">Sync History</h1>
    <p class="mb-6 text-muted-foreground">View sync runs and per-record failures.</p>

    <Alert v-if="error" variant="destructive" class="mb-4">{{ error }}</Alert>
    <LoadingState v-if="loading" />
    <EmptyState v-else-if="!syncRuns.length" title="No sync runs yet" description="Trigger a sync from a connector detail page." />
    <div v-else class="space-y-4">
      <Card v-for="run in syncRuns" :key="run.id">
        <CardContent class="p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span class="font-medium">{{ run.connectorId }}</span>
              <span class="ml-2 text-sm text-muted-foreground">
                {{ new Date(run.startedAt).toLocaleString() }}
              </span>
            </div>
            <Badge :variant="statusVariant(run.status)">{{ run.status }}</Badge>
          </div>
          <p class="mt-2 text-sm">
            Processed: {{ run.recordsProcessed }} · Succeeded: {{ run.recordsSucceeded }} · Failed:
            {{ run.recordsFailed }}
            <span class="text-muted-foreground">({{ run.triggeredBy }})</span>
          </p>
          <p v-if="run.errorMessage" class="mt-1 text-sm text-destructive">{{ run.errorMessage }}</p>
          <button
            v-if="run.recordsFailed > 0"
            class="mt-2 text-sm text-primary hover:underline"
            @click="toggleErrors(run.id)"
          >
            {{ expandedErrors[run.id] ? "Hide" : "Show" }} errors
          </button>
          <ul v-if="expandedErrors[run.id]" class="mt-2 space-y-1 text-sm text-destructive">
            <li v-for="err in expandedErrors[run.id]" :key="err.id">
              {{ err.externalId }}: {{ err.message }}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
