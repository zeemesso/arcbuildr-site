// Builds the site twice, as a preview branch and as main, and checks that the
// feedback toolbar, draft pages and indexability follow the branch rules.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";

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
  const home = readFileSync("dist-main/index.html", "utf8");
  if (home.includes('content="noindex"')) throw new Error("main home page is noindex");
  // The video block's demo, with its test film, is for previews only.
  const demo = (dir) => files(dir).filter((f) => /\/demo\/|vsl-demo/.test(f));
  if (demo("dist-preview").length < 2)
    throw new Error("preview build has no /demo/vsl/ page or film");
  if (demo("dist-main").length)
    throw new Error(`main build carries the demo: ${demo("dist-main")}`);
  if (/vsl=demo|\/demo\/vsl/.test(home)) throw new Error("main home page knows the demo's address");
  const sitemap = readFileSync("dist-main/sitemap.xml", "utf8");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  if (
    JSON.stringify(urls) !==
    JSON.stringify(["https://arcbuildr.co/", "https://arcbuildr.co/privacy"])
  )
    throw new Error("sitemap must list only / and /privacy");
  // Count scripts reachable from the page. React's unused integration asset is not loaded.
  const scriptTags = [...home.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  const reachable = new Set();
  function scriptSize(source, directory = "dist-main") {
    let bytes = source ? gzipSync(source).length : 0;
    for (const match of source.matchAll(/["']((?:\.\.?\/|\/_astro\/)[^"']+\.js)["']/g)) {
      const path = match[1].startsWith("/")
        ? join("dist-main", match[1])
        : join(directory, match[1]);
      if (reachable.has(path)) continue;
      reachable.add(path);
      bytes += scriptSize(readFileSync(path, "utf8"), dirname(path));
    }
    return bytes;
  }
  let scriptBytes = 0;
  for (const [, attributes, body] of scriptTags) {
    const src = attributes.match(/src="([^" ]+)"/);
    if (src && src[1].startsWith("/")) {
      const path = join("dist-main", src[1]);
      if (!reachable.has(path)) {
        reachable.add(path);
        scriptBytes += scriptSize(readFileSync(path, "utf8"), dirname(path));
      }
    }
    scriptBytes += scriptSize(body);
  }
  // The budget was 3 KB while the application was a hosted form. Since L1-P9 the page carries its own
  // form (one question per screen, saved answers, retries), which is most of these bytes.
  if (scriptBytes >= 10 * 1024)
    throw new Error(`Main JavaScript reaches 10 KB gzipped: ${scriptBytes} bytes`);
  console.log(`main JavaScript: ${scriptBytes} bytes gzipped (including the map)`);
  // Remove ALLOW_NO_CONTACT_EMAIL=1 from test:main-build once the address is set.
  if (
    process.env.ALLOW_NO_CONTACT_EMAIL !== "1" &&
    readFileSync("dist-main/privacy/index.html", "utf8").includes("[contact email]")
  )
    throw new Error(
      "CONTACT_EMAIL is empty. Set src/config.ts before the main build, or temporarily use ALLOW_NO_CONTACT_EMAIL=1.",
    );
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
