import { Agentation } from "agentation";
import { createRoot } from "react-dom/client";

/** Visual feedback toolbar for previews. Only reached when __PREVIEW__ is true. */
const host = document.createElement("div");
document.body.appendChild(host);
// Live sync to the local agentation-mcp server in `astro dev` only; preview builds keep copy-to-clipboard.
createRoot(host).render(
  <Agentation endpoint={import.meta.env.DEV ? "http://localhost:4747" : undefined} />,
);
