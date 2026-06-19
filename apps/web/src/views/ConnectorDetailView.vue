<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api, type Connection } from "@/lib/api";
import Card from "@/components/ui/Card.vue";
import CardHeader from "@/components/ui/CardHeader.vue";
import CardTitle from "@/components/ui/CardTitle.vue";
import CardContent from "@/components/ui/CardContent.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import LoadingState from "@/components/LoadingState.vue";
import Alert from "@/components/ui/Alert.vue";

const route = useRoute();
const connectorId = route.params.id as string;
const connection = ref<Connection | null>(null);
const loading = ref(true);
const syncing = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

onMounted(async () => {
  try {
    const { connections } = await api.getConnections();
    connection.value = connections.find((c) => c.connectorId === connectorId) ?? null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to load";
  } finally {
    loading.value = false;
  }
});

async function syncNow() {
  if (!connection.value) return;
  syncing.value = true;
  error.value = null;
  success.value = null;
  try {
    const { syncRunId } = await api.triggerSync(connection.value.id, connectorId);
    success.value = `Sync started: ${syncRunId}`;
    const { connections } = await api.getConnections();
    connection.value = connections.find((c) => c.connectorId === connectorId) ?? null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Sync failed";
  } finally {
    syncing.value = false;
  }
}

async function simulateWebhook() {
  if (!connection.value) return;
  syncing.value = true;
  try {
    const { syncRunId } = await api.simulateWebhook(connection.value.id, connectorId, {
      event: "contact.created",
      simulated: true,
    });
    success.value = `Webhook sync started: ${syncRunId}`;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Webhook simulation failed";
  } finally {
    syncing.value = false;
  }
}
</script>

<template>
  <div>
    <router-link to="/connectors" class="text-sm text-primary hover:underline">← Back</router-link>
    <h1 class="mt-2 text-3xl font-bold capitalize">{{ connectorId.replace("-", " ") }}</h1>

    <LoadingState v-if="loading" />
    <Alert v-else-if="!connection" variant="destructive" class="mt-4">
      Not connected. Go to Connectors to connect this integration.
    </Alert>
    <template v-else>
      <Alert v-if="error" variant="destructive" class="mt-4">{{ error }}</Alert>
      <Alert v-if="success" class="mt-4">{{ success }}</Alert>

      <Card class="mt-6">
        <CardHeader>
          <CardTitle>Connection status</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex gap-4">
            <Badge variant="success">{{ connection.status }}</Badge>
            <span v-if="connection.lastSyncAt" class="text-sm text-muted-foreground">
              Last sync: {{ new Date(connection.lastSyncAt).toLocaleString() }}
            </span>
            <span v-if="connection.lastSyncRecordCount != null" class="text-sm">
              Records synced: {{ connection.lastSyncRecordCount }}
            </span>
          </div>
          <div class="flex gap-2">
            <Button :disabled="syncing" @click="syncNow">
              {{ syncing ? "Syncing..." : "Sync now" }}
            </Button>
            <Button variant="outline" :disabled="syncing" @click="simulateWebhook">
              Simulate webhook
            </Button>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
