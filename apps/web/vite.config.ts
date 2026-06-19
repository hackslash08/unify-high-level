import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const sharePort = 5180;

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: process.env.VITE_SHARE_MODE === "true" ? sharePort : 5173,
    strictPort: process.env.VITE_SHARE_MODE === "true",
    /** Allow ngrok and other tunnel hostnames */
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001/test-project-5ed42/us-central1/api",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
