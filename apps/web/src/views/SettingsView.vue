<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card.vue";
import CardHeader from "@/components/ui/CardHeader.vue";
import CardTitle from "@/components/ui/CardTitle.vue";
import CardContent from "@/components/ui/CardContent.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import LoadingState from "@/components/LoadingState.vue";
import Alert from "@/components/ui/Alert.vue";

const route = useRoute();
const loading = ref(true);
const hlConnected = ref(false);
const connecting = ref(false);
const message = ref<string | null>(null);

onMounted(async () => {
  if (route.query.hl === "connected") {
    message.value = "HighLevel connected successfully!";
  }
  try {
    const me = await api.getMe();
    hlConnected.value = me.hlConnected;
  } finally {
    loading.value = false;
  }
});

async function connectHighLevel() {
  connecting.value = true;
  try {
    const { url } = await api.startHlOAuth();
    window.location.href = url;
  } catch (e) {
    message.value = e instanceof Error ? e.message : "Failed to start OAuth";
  } finally {
    connecting.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-3xl font-bold">Settings</h1>
    <Alert v-if="message" class="mb-4">{{ message }}</Alert>
    <LoadingState v-if="loading" />
    <Card v-else>
      <CardHeader>
        <CardTitle>HighLevel Connection</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex items-center gap-3">
          <span>Status:</span>
          <Badge :variant="hlConnected ? 'success' : 'default'">
            {{ hlConnected ? "Connected" : "Not connected" }}
          </Badge>
        </div>
        <Button v-if="!hlConnected" :disabled="connecting" @click="connectHighLevel">
          {{ connecting ? "Redirecting..." : "Connect HighLevel" }}
        </Button>
        <p v-else class="text-sm text-muted-foreground">
          Your HighLevel account is linked. Syncs will push contacts to your sandbox location.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
