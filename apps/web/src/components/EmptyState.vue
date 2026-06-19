<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <p class="text-lg font-medium">{{ title }}</p>
    <p v-if="description" class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>
