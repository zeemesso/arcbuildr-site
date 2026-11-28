import { defineConfig } from "vitest/config";

export default defineConfig({
  // The style files are read as text by tests/design-source.test.ts; Vitest blanks CSS it does not include.
  test: { include: ["tests/**/*.test.ts"], css: { include: [/\.css\?raw$/] } },
});
