import { testSample } from "./test-sample";
import type { MagnetDefinition } from "./types";

// Every magnet the site knows. To add one: write src/magnets/<slug>.ts, add it here,
// push its private brief (MAGNET-PLAN.md), then set status to "live".
export const MAGNETS: MagnetDefinition[] = [testSample];

export const getMagnet = (slug: string) => MAGNETS.find((m) => m.slug === slug);

/** Live magnets always; drafts only where drafts are allowed (preview builds, local runs). */
export const visibleMagnets = (drafts: boolean) =>
  MAGNETS.filter((m) => m.status === "live" || drafts);
