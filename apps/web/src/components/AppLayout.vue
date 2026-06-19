<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import Button from "@/components/ui/Button.vue";

const router = useRouter();
const auth = useAuthStore();

async function signOut() {
  await auth.signOut();
  router.push("/login");
}
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-border bg-card">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div class="flex items-center gap-8">
          <router-link to="/" class="text-lg font-bold text-primary">
            Unify
          </router-link>
          <nav v-if="auth.user" class="flex gap-4 text-sm">
            <router-link to="/connectors" class="hover:text-primary">Connectors</router-link>
            <router-link to="/contacts" class="hover:text-primary">Contacts</router-link>
            <router-link to="/sync-history" class="hover:text-primary">Sync History</router-link>
            <router-link to="/settings" class="hover:text-primary">Settings</router-link>
          </nav>
        </div>
        <Button v-if="auth.user" variant="outline" size="sm" @click="signOut">
          Sign out
        </Button>
      </div>
    </header>
    <main class="mx-auto max-w-7xl px-4 py-8">
      <slot />
    </main>
  </div>
</template>
