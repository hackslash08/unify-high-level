<script setup lang="ts">
import { cn } from "@/lib/utils";

const model = defineModel<string>();

defineProps<{
  type?: string;
  placeholder?: string;
  class?: string;
  disabled?: boolean;
}>();
</script>

<template>
  <input
    v-model="model"
    :type="type ?? 'text'"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="
      cn(
        'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
        $props.class
      )
    "
  />
</template>
