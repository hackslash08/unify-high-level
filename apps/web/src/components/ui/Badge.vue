<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{ variant?: "default" | "success" | "warning" | "destructive" }>(),
  { variant: "default" }
);

const classes = computed(() =>
  cn(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
    {
      default: "bg-primary/10 text-primary",
      success: "bg-green-100 text-green-800",
      warning: "bg-yellow-100 text-yellow-800",
      destructive: "bg-red-100 text-red-800",
    }[props.variant]
  )
);
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
