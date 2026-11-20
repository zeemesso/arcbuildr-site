/// <reference types="astro/client" />

/** True on preview builds, false on main. Set in astro.config.mjs. */
declare const __PREVIEW__: boolean;

// The one Node call a page makes at build time (src/pages/booked.astro), without the whole of Node's types.
declare module "node:fs" {
  export function existsSync(path: string | URL): boolean;
}
