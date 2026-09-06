import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** The e2e suite runs real OCR and needs to download language data, so it is opt-in. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    exclude: ["**/node_modules/**", "**/*.e2e.test.ts"],
  },
});
