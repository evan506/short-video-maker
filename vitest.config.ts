import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: 'node', // Use node environment for logic tests without DOM
    setupFiles: [],
  },
});
