<script setup lang="ts">
import { cn } from "@/lib/utils";

withDefaults(defineProps<{ variant?: "default" | "destructive" }>(), {
  variant: "default",
});
</script>

<template>
  <div
    :class="
      cn(
        'relative w-full rounded-lg border p-4',
        variant === 'destructive'
          ? 'border-destructive/50 text-destructive'
          : 'border-border bg-muted/50'
      )
    "
    role="alert"
  >
    <slot />
  </div>
</template>
