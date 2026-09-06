import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["**/*.e2e.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
