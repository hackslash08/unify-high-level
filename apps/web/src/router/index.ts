import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: () => import("@/views/LoginView.vue"), meta: { guest: true } },
    { path: "/", redirect: "/connectors" },
    { path: "/connectors", name: "connectors", component: () => import("@/views/ConnectorsView.vue") },
    { path: "/connectors/:id", name: "connector-detail", component: () => import("@/views/ConnectorDetailView.vue") },
    { path: "/contacts", name: "contacts", component: () => import("@/views/ContactsView.vue") },
    { path: "/sync-history", name: "sync-history", component: () => import("@/views/SyncHistoryView.vue") },
    { path: "/settings", name: "settings", component: () => import("@/views/SettingsView.vue") },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (auth.loading) {
    await new Promise<void>((resolve) => {
      const stop = setInterval(() => {
        if (!auth.loading) {
          clearInterval(stop);
          resolve();
        }
      }, 50);
    });
  }

  if (to.meta.guest && auth.isAuthenticated) return "/connectors";
  if (!to.meta.guest && !auth.isAuthenticated) return "/login";
});

export default router;
