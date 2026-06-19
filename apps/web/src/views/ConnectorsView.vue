<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { api, type ConnectorMeta, type Connection } from "@/lib/api";
import Card from "@/components/ui/Card.vue";
import CardHeader from "@/components/ui/CardHeader.vue";
import CardTitle from "@/components/ui/CardTitle.vue";
import CardContent from "@/components/ui/CardContent.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import LoadingState from "@/components/LoadingState.vue";
import EmptyState from "@/components/EmptyState.vue";
import Alert from "@/components/ui/Alert.vue";

const router = useRouter();
const connectors = ref<ConnectorMeta[]>([]);
const connections = ref<Connection[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const connecting = ref<string | null>(null);

const connectionMap = computed(() => {
  const map = new Map<string, Connection>();
  for (const c of connections.value) {
    map.set(c.connectorId, c);
  }
  return map;
});

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [c, conn] = await Promise.all([api.getConnectors(), api.getConnections()]);
    connectors.value = c.connectors;
    connections.value = conn.connections;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to load connectors";
  } finally {
    loading.value = false;
  }
}

function statusFor(id: string) {
  const conn = connectionMap.value.get(id);
  return conn?.status ?? "disconnected";
}

async function connect(connectorId: string) {
  connecting.value = connectorId;
  try {
    const { url } = await api.startConnectorOAuth(connectorId);
    window.location.href = url;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Connect failed";
  } finally {
    connecting.value = null;
  }
}

async function disconnect(connectionId: string) {
  await api.disconnect(connectionId);
  await load();
}
</script>

<template>
  <div>
    <h1 class="mb-2 text-3xl font-bold">Connectors</h1>
    <p class="mb-6 text-muted-foreground">
      Connect external accounts to sync normalized data into HighLevel.
    </p>

    <Alert v-if="error" variant="destructive" class="mb-4">{{ error }}</Alert>
    <LoadingState v-if="loading" />
    <EmptyState
      v-else-if="!connectors.length"
      title="No connectors available"
      description="Check your API configuration."
    />
    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="connector in connectors" :key="connector.id">
        <CardHeader>
          <div class="flex items-start justify-between">
            <CardTitle class="text-lg">{{ connector.name }}</CardTitle>
            <Badge
              :variant="
                statusFor(connector.id) === 'connected'
                  ? 'success'
                  : connector.isMock
                    ? 'warning'
                    : 'default'
              "
            >
              {{ statusFor(connector.id) }}
            </Badge>
          </div>
          <p class="text-sm text-muted-foreground">{{ connector.description }}</p>
        </CardHeader>
        <CardContent class="flex gap-2">
          <Button
            v-if="statusFor(connector.id) !== 'connected'"
            size="sm"
            :disabled="connecting === connector.id"
            @click="connect(connector.id)"
          >
            {{ connecting === connector.id ? "Connecting..." : "Connect" }}
          </Button>
          <template v-else>
            <Button size="sm" variant="outline" @click="router.push(`/connectors/${connector.id}`)">
              Details
            </Button>
            <Button
              size="sm"
              variant="destructive"
              @click="disconnect(connectionMap.get(connector.id)!.id)"
            >
              Disconnect
            </Button>
          </template>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
