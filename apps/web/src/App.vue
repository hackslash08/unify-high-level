<script setup lang="ts">
import { RouterView } from "vue-router";
import AppLayout from "@/components/AppLayout.vue";
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <AppLayout v-if="route.name !== 'login'">
    <RouterView />
  </AppLayout>
  <RouterView v-else />
</template>
