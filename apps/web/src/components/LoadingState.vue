<template>
  <div class="flex items-center justify-center py-12 text-muted-foreground">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    <span class="ml-3">{{ message ?? "Loading..." }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message?: string }>();
</script>
