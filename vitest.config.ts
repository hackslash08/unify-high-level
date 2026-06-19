import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/**/*.test.ts",
      "functions/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/**/*.ts", "functions/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/dist/**"],
    },
  },
  resolve: {
    alias: {
      "@highlevel/shared": path.resolve(__dirname, "packages/shared/src"),
      "@highlevel/connectors": path.resolve(__dirname, "packages/connectors/src"),
    },
  },
});
