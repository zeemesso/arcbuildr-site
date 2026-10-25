import { defineConfig } from "astro/config";
import { resolveBranch } from "./scripts/build-info.mjs";

// Same rule as the Worker and the footer: unknown branch counts as main.
const { branch } = resolveBranch(process.env);
const preview = !["main", "unknown", ""].includes(branch);

export default defineConfig({
  site: "https://arcbuildr.co",
  output: "static",
  trailingSlash: "ignore",
  // Replaced at build time, so the toolbar code is dropped from main builds.
  vite: { define: { __PREVIEW__: JSON.stringify(preview) } },
});
