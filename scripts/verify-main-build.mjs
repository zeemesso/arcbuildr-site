// Builds the site twice, as a preview branch and as main, and checks that the
// feedback toolbar is in the first build and nowhere in the second.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const run = (cmd, args, env) =>
  execFileSync(cmd, args, { stdio: "pipe", env: { ...process.env, ...env } });

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

function buildAs(branch, outDir) {
  rmSync(outDir, { recursive: true, force: true });
  run("node", ["scripts/build-info.mjs"], { WORKERS_CI_BRANCH: branch });
  run("npx", ["astro", "build", "--outDir", outDir], { WORKERS_CI_BRANCH: branch });
  return files(outDir)
    .filter((f) => /\.(js|html|css|map)$/.test(f))
    .filter((f) => /agentation/i.test(readFileSync(f, "utf8")));
}

try {
  const onPreview = buildAs("claude/build", "dist-preview");
  const onMain = buildAs("main", "dist-main");
  if (onPreview.length === 0) throw new Error("preview build has no Agentation code");
  if (onMain.length > 0)
    throw new Error(`main build contains Agentation code: ${onMain.join(", ")}`);
  console.log(
    `ok: preview build has Agentation in ${onPreview.length} file(s); main build has none`,
  );
} finally {
  rmSync("dist-preview", { recursive: true, force: true });
  rmSync("dist-main", { recursive: true, force: true });
  run("node", ["scripts/build-info.mjs"], {});
}
