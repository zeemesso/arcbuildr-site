import { Agentation } from "agentation";
import { createRoot } from "react-dom/client";

/** Visual feedback toolbar for previews. Only reached when __PREVIEW__ is true. */
const host = document.createElement("div");
document.body.appendChild(host);
createRoot(host).render(<Agentation />);
