// Builds the site twice, as a preview branch and as main, and checks that the
// feedback toolbar, draft pages and indexability follow the branch rules.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
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

const noindex = /<meta\s+name="robots"\s+content="noindex"\s*\/?\s*>/;

function verifyMagnetPages(outDir, preview) {
  const sample = join(outDir, "m/test-sample/index.html");
  if (existsSync(sample) !== preview)
    throw new Error(`unexpected /m/test-sample page in ${outDir}`);
  if (preview && !noindex.test(readFileSync(sample, "utf8")))
    throw new Error("preview /m/test-sample has no noindex meta tag");

  for (const page of ["plan", "unsubscribe"]) {
    const file = join(outDir, page, "index.html");
    if (!existsSync(file) || !noindex.test(readFileSync(file, "utf8")))
      throw new Error(`/${page} is missing or has no noindex meta tag in ${outDir}`);
  }

  const sitemap = readFileSync(join(outDir, "sitemap.xml"), "utf8");
  for (const [, location] of sitemap.matchAll(/<loc>(.+?)<\/loc>/g)) {
    const path = new URL(location).pathname.replace(/\/$/, "");
    if (/^\/(plan|unsubscribe)(\/|$)/.test(path))
      throw new Error(`sitemap in ${outDir} lists ${path}`);
    if (path.startsWith("/m/")) {
      const mainPage = join("dist-main", path, "index.html");
      if (!existsSync(mainPage) || noindex.test(readFileSync(mainPage, "utf8")))
        throw new Error(`sitemap in ${outDir} lists a non-indexable magnet: ${path}`);
    }
  }
}

try {
  const onPreview = buildAs("claude/build", "dist-preview");
  const onMain = buildAs("main", "dist-main");
  if (onPreview.length === 0) throw new Error("preview build has no Agentation code");
  const robots = readFileSync("dist-main/robots.txt", "utf8");
  if (robots.includes("Disallow") || !robots.includes("Sitemap:"))
    throw new Error("main robots.txt is wrong");
  if (readFileSync("dist-main/sitemap.xml", "utf8").includes("thanks"))
    throw new Error("sitemap lists /thanks");
  const home = readFileSync("dist-main/index.html", "utf8");
  if (home.includes('content="noindex"')) throw new Error("main home page is noindex");
  if (!readFileSync("dist-main/thanks/index.html", "utf8").includes('content="noindex"'))
    throw new Error("/thanks is not noindex");
  if (onMain.length > 0)
    throw new Error(`main build contains Agentation code: ${onMain.join(", ")}`);
  verifyMagnetPages("dist-preview", true);
  verifyMagnetPages("dist-main", false);
  console.log(
    `ok: preview build has Agentation in ${onPreview.length} file(s) and the draft magnet; main has neither; /plan is noindex and both sitemaps exclude drafts and /plan`,
  );
} finally {
  rmSync("dist-preview", { recursive: true, force: true });
  rmSync("dist-main", { recursive: true, force: true });
  run("node", ["scripts/build-info.mjs"], {});
}
