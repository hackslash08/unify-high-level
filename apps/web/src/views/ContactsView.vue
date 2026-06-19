<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, type UnifiedContact } from "@/lib/api";
import LoadingState from "@/components/LoadingState.vue";
import EmptyState from "@/components/EmptyState.vue";
import Alert from "@/components/ui/Alert.vue";
import Table from "@/components/ui/Table.vue";
import Badge from "@/components/ui/Badge.vue";

const contacts = ref<UnifiedContact[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const sourceFilter = ref("");

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const data = await api.getContacts(sourceFilter.value || undefined);
    contacts.value = data.contacts;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to load contacts";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="mb-2 text-3xl font-bold">Unified Contacts</h1>
    <p class="mb-6 text-muted-foreground">
      Normalized contacts across all connected sources.
    </p>

    <div class="mb-4 flex gap-2">
      <select
        v-model="sourceFilter"
        class="h-10 rounded-md border border-border px-3 text-sm"
        @change="load"
      >
        <option value="">All sources</option>
        <option value="google-contacts">Google Contacts</option>
        <option value="mock-stripe">Mock Stripe</option>
        <option value="hubspot">HubSpot</option>
      </select>
    </div>

    <Alert v-if="error" variant="destructive" class="mb-4">{{ error }}</Alert>
    <LoadingState v-if="loading" />
    <EmptyState
      v-else-if="!contacts.length"
      title="No contacts yet"
      description="Connect a source and run a sync to see normalized contacts."
    />
    <Table v-else>
      <thead>
        <tr class="border-b text-left">
          <th class="p-3 font-medium">Name</th>
          <th class="p-3 font-medium">Email</th>
          <th class="p-3 font-medium">Phone</th>
          <th class="p-3 font-medium">Company</th>
          <th class="p-3 font-medium">Source</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="contact in contacts"
          :key="`${contact.source}-${contact.externalId}`"
          class="border-b hover:bg-muted/50"
        >
          <td class="p-3">
            {{ contact.fullName || `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || "—" }}
          </td>
          <td class="p-3">{{ contact.email || "—" }}</td>
          <td class="p-3">{{ contact.phone || "—" }}</td>
          <td class="p-3">{{ contact.companyName || "—" }}</td>
          <td class="p-3"><Badge>{{ contact.source }}</Badge></td>
        </tr>
      </tbody>
    </Table>
  </div>
</template>
