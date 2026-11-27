// The magnet tool: npm run magnet -- <new|check|push|review> <slug> [flags]
//
// A magnet has a public half in this repo (src/magnets/<slug>.ts: title, questions) and a
// private half on this machine (outline, method notes, hot-lead rule, test answers). The
// private half lives in ~/arcbuildr-magnets/<slug>/ and reaches the database with "push".
// This repo is public: nothing from that folder is ever written into it.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { memoryDb } from "../tests/helpers/memory-db.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const HOME = process.env.MAGNET_HOME || join(homedir(), "arcbuildr-magnets");
const DATABASE = "arcbuildr-magnets";
const LOCAL_CONFIG = "wrangler.magnet-local.jsonc";
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const USAGE = `npm run magnet -- <command> <slug>

  new <slug>      Start a magnet: a draft page definition in src/magnets/ and a private
                  folder in ${HOME}/<slug>/.
  check <slug>    Check the definition, the private brief and the test answers. Free.
  push <slug>     Put the private brief in the local database. Add --remote for the real one.
  review <slug>   Show the most a test run can cost. Add --spend to run it on the Claude API:
                  it writes the deliverable and the emails for every test answer file into
                  <slug>/review/. --fixture=<name> runs one file only.`;

class Stop extends Error {}
const stop = (message) => {
  throw new Stop(message);
};
const dollars = (microUsd) => `$${(microUsd / 1e6).toFixed(3)}`;
const read = (path) => readFileSync(path, "utf8");
const folderOf = (slug) => join(HOME, slug);

/** Bundles the engine modules into one file Node can import. Takes about a second. */
async function loadKit() {
  let esbuild;
  try {
    esbuild = await import("esbuild");
  } catch {
    stop("esbuild is missing. Run npm install first.");
  }
  const outfile = join(ROOT, "node_modules/.cache/arcbuildr-magnet/kit.mjs");
  await esbuild.build({
    entryPoints: [join(ROOT, "scripts/magnet-kit.ts")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "warning",
  });
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

/** The private brief, put together from the three files in the magnet's folder. */
function loadBrief(slug) {
  const folder = folderOf(slug);
  if (!existsSync(folder)) stop(`No folder ${folder}. Run: npm run magnet -- new ${slug}`);
  const settings = JSON.parse(read(join(folder, "brief.json")));
  return {
    slug,
    outline: read(join(folder, "outline.md")).trim(),
    knowledge: read(join(folder, "knowledge.md")).trim(),
    maxWords: settings.maxWords,
    hotRule: settings.hotRule,
    ...(settings.followUp ? { followUp: settings.followUp } : {}),
  };
}

/** The test answer files: [{ name, data }]. */
function loadFixtures(slug, only) {
  const folder = join(folderOf(slug), "fixtures");
  const files = existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith(".json")) : [];
  return files
    .map((file) => ({ name: basename(file, ".json"), data: JSON.parse(read(join(folder, file))) }))
    .filter((fixture) => !only || fixture.name === only)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Runs a test answer file through the same checks as a real form. */
function parseFixture(kit, magnet, fixture) {
  const { FIELD, answerField } = kit;
  const { data, name } = fixture;
  const answers = data.answers ?? {};
  const known = new Set(magnet.questions.map((question) => question.id));
  const unknown = Object.keys(answers).filter((id) => !known.has(id));
  if (unknown.length > 0)
    return { ok: false, errors: { answers: `unknown question ids: ${unknown.join(", ")}` } };

  const form = new FormData();
  form.set(FIELD.name, data.name ?? `TEST ${name}`);
  form.set(FIELD.email, data.email ?? `test-${name}@example.com`);
  form.set(FIELD.instagram, data.instagram ?? "@test.lead");
  form.set(FIELD.phone, data.phone ?? "");
  form.set(FIELD.consent, "on");
  form.set(FIELD.timeZone, data.tz ?? "Europe/Paris");
  for (const [id, text] of Object.entries(answers)) form.set(answerField(id), String(text));
  return kit.parseSubmission(magnet, form);
}

/** True when a template placeholder is still in there. */
const unfinished = (value) => JSON.stringify(value).includes("TODO");

/** Every problem with a magnet, in plain words. Empty means it can be pushed and reviewed. */
function problemsOf(kit, slug, { fixtures = true } = {}) {
  const problems = [];
  const magnet = kit.getMagnet(slug);
  if (!magnet) return { problems: [`no magnet "${slug}" in src/magnets/registry.ts`] };
  problems.push(...kit.checkDefinition(magnet));
  if (unfinished(magnet)) problems.push(`src/magnets/${slug}.ts still has TODO text`);

  let brief = null;
  try {
    brief = loadBrief(slug);
    problems.push(...kit.checkBrief(brief).map((text) => `brief: ${text}`));
    if (unfinished(brief))
      problems.push("brief: outline.md, knowledge.md or brief.json still has TODO text");
    if (brief.followUp && magnet.lessons.length > brief.followUp.days.length)
      problems.push(
        "brief: more lesson videos than follow-up emails; the extra ones are never sent",
      );
  } catch (error) {
    if (error instanceof Stop) throw error;
    problems.push(`brief: ${error.message}`);
  }

  const parsed = [];
  if (fixtures) {
    const all = loadFixtures(slug);
    if (all.length === 0) problems.push("no test answers in fixtures/");
    for (const fixture of all) {
      if (unfinished(fixture.data))
        problems.push(`fixtures/${fixture.name}.json still has TODO text`);
      const result = parseFixture(kit, magnet, fixture);
      if (result.ok) parsed.push({ name: fixture.name, lead: result.lead });
      else
        for (const [field, text] of Object.entries(result.errors))
          problems.push(`fixtures/${fixture.name}.json: ${field}: ${text}`);
    }
  }
  return { problems, magnet, brief, parsed };
}

function report(problems) {
  for (const problem of problems) console.error(`  - ${problem}`);
}

// --- new -------------------------------------------------------------------------------

const camel = (slug) => slug.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());

const definitionTemplate = (slug) => `import type { MagnetDefinition } from "./types";

// Draft. Every text below is a placeholder: replace it, then run
// \`npm run magnet -- check ${slug}\`. A live magnet needs 10 questions or more and a hero video.
export const ${camel(slug)}: MagnetDefinition = {
  slug: "${slug}",
  status: "draft",
  title: "TODO: the promise, in the visitor's words",
  forWho: "TODO: one line, who this is for",
  deliverableName: "your plan",
  intro: "TODO: what they get and what it takes.",
  minutes: 10,
  heroVideo: null,
  lessons: [],
  questions: [
    {
      id: "business",
      kind: "short",
      role: "circumstance",
      label: "TODO: what do you sell, and to whom?",
    },
    {
      id: "problem",
      kind: "long",
      role: "problem",
      label: "TODO: where are you stuck right now?",
      help: "Voice-to-text works well here.",
    },
    {
      id: "outcome",
      kind: "long",
      role: "outcome",
      label: "TODO: what should be true in 90 days?",
    },
  ],
  keyword: "todo",
  meta: {
    title: "TODO | Arcbuildr",
    description: "TODO: one sentence for search results and link previews.",
  },
};
`;

const OUTLINE = `## TODO: first section

What this section must tell the reader.

## TODO: second section

## TODO: next steps
`;

const KNOWLEDGE = `TODO: the method notes the writer may use. Your own words, rules and examples.
The reader never sees this text, and it never leaves this folder and the database.
`;

const BRIEF = {
  maxWords: 900,
  hotRule: "TODO: in plain words, when a lead counts as hot.",
  followUp: {
    days: [1, 3, 6],
    guidance: "TODO: one line per email, in order. What each one teaches.",
  },
};

const FIXTURE = {
  name: "TEST Example",
  instagram: "@test.example",
  answers: {
    business: "TODO: a realistic answer.",
    problem: "TODO: a realistic answer, as long as a real person would type.",
    outcome: "TODO: a realistic answer.",
  },
};

function writeNew(path, content) {
  if (existsSync(path)) return console.log(`  kept     ${path}`);
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, content);
  console.log(`  created  ${path}`);
}

function addToRegistry(slug) {
  const path = join(ROOT, "src/magnets/registry.ts");
  const source = read(path);
  if (source.includes(`"./${slug}"`)) return true;
  const name = camel(slug);
  const withImport = source.replace(
    'import type { MagnetDefinition } from "./types";',
    `import { ${name} } from "./${slug}";\nimport type { MagnetDefinition } from "./types";`,
  );
  const next = withImport.replace(
    /(export const MAGNETS: MagnetDefinition\[\] = \[)([^\]]*)\]/,
    (_, open, list) => `${open}${list.trim().replace(/,$/, "")}, ${name}]`,
  );
  if (withImport === source || next === withImport) return false;
  writeFileSync(path, next);
  return true;
}

function create(slug) {
  if (slug === "types" || slug === "registry") stop(`"${slug}" is taken by the engine.`);
  const definition = join(ROOT, `src/magnets/${slug}.ts`);
  const folder = folderOf(slug);
  writeNew(definition, definitionTemplate(slug));
  writeNew(join(folder, "outline.md"), OUTLINE);
  writeNew(join(folder, "knowledge.md"), KNOWLEDGE);
  writeNew(join(folder, "brief.json"), `${JSON.stringify(BRIEF, null, 2)}\n`);
  writeNew(join(folder, "fixtures/example.json"), `${JSON.stringify(FIXTURE, null, 2)}\n`);

  const registered = addToRegistry(slug);
  if (registered)
    execFileSync("npx", ["prettier", "--write", definition, "src/magnets/registry.ts"], {
      cwd: ROOT,
      stdio: "ignore",
    });
  else
    console.log(
      `  Add it by hand: import { ${camel(slug)} } from "./${slug}" in src/magnets/registry.ts`,
    );
  console.log(`\nNext: fill the files, then run: npm run magnet -- check ${slug}`);
}

// --- push ------------------------------------------------------------------------------

function push(kit, slug, remote) {
  const { problems, brief } = problemsOf(kit, slug, { fixtures: false });
  if (problems.length > 0) {
    report(problems);
    stop("Not pushed. Fix the list above first.");
  }
  // The brief goes in as hex, so no quote or semicolon in it can break the statement.
  const hex = Buffer.from(JSON.stringify(brief), "utf8").toString("hex");
  const sql = `INSERT INTO magnet_briefs (slug, brief_json, updated_at)
VALUES ('${slug}', CAST(X'${hex}' AS TEXT), '${new Date().toISOString()}')
ON CONFLICT (slug) DO UPDATE SET brief_json = excluded.brief_json, updated_at = excluded.updated_at;
`;
  const scratch = mkdtempSync(join(tmpdir(), "magnet-"));
  const file = join(scratch, "brief.sql");
  try {
    writeFileSync(file, sql, { mode: 0o600 });
    const where = remote ? ["--remote"] : ["--local", "--config", LOCAL_CONFIG];
    execFileSync("npx", ["wrangler", "d1", "execute", DATABASE, "--file", file, ...where], {
      cwd: ROOT,
      stdio: "inherit",
    });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  console.log(`Pushed the brief for "${slug}" to the ${remote ? "REAL" : "local"} database.`);
}

// --- review ----------------------------------------------------------------------------

/** KEY=value lines from .dev.vars, the git-ignored file wrangler dev also reads. */
function devVars() {
  const path = join(ROOT, ".dev.vars");
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    read(path)
      .split("\n")
      .map((line) => /^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line))
      .filter(Boolean)
      .map((match) => [match[1], match[2]]),
  );
}

function reviewPage(fixture, lead, emails, outcome, lessons) {
  const words = lead.deliverable ? lead.deliverable.trim().split(/\s+/).length : 0;
  const mail = emails.flatMap((email) => [
    `### Email ${email.step === 0 ? "0 (the link)" : email.step}, due ${email.due_at.slice(0, 10)}`,
    "",
    `Subject: ${email.subject}`,
    "",
    "```text",
    email.body,
    "```",
    "",
  ]);
  return [
    `# Review: ${fixture}`,
    "",
    `- Outcome: ${outcome}${lead.error ? ` (${lead.error})` : ""}`,
    `- Lesson emails: ${lessons}`,
    `- Score: ${lead.score ?? "-"} of 5`,
    `- Setter note: ${lead.setterNote ?? "-"}`,
    `- Screen reason: ${lead.screenReason ?? "-"}`,
    `- Cost: ${dollars(lead.costMicroUsd)}`,
    `- Words: ${words}`,
    "",
    "## Deliverable",
    "",
    lead.deliverable ?? "(none)",
    "",
    "## Emails",
    "",
    ...(mail.length > 0 ? mail : ["(none)"]),
  ].join("\n");
}

async function review(kit, slug, flags) {
  const { problems, magnet, brief, parsed } = problemsOf(kit, slug);
  if (problems.length > 0) {
    report(problems);
    stop("Not reviewed. Fix the list above first.");
  }
  const chosen = parsed.filter((entry) => !flags.fixture || entry.name === flags.fixture);
  if (chosen.length === 0) stop(`No test answers named "${flags.fixture}".`);

  // The real engine on a database in memory: nothing is stored, sent or queued.
  const db = memoryDb();
  const now = () => new Date();
  await kit.putBrief(db, brief, now());
  const runs = [];
  let worstTotal = 0;
  for (const { name, lead } of chosen) {
    const id = crypto.randomUUID();
    await kit.insertLead(db, {
      ...lead,
      id,
      token: kit.newToken(),
      unsub: kit.newToken(),
      createdAt: now().toISOString(),
    });
    const stored = await kit.getLead(db, id);
    // The lesson emails are priced as if the deliverable used its whole length.
    const full = { ...stored, deliverable: "x".repeat(brief.maxWords * 8) };
    const calls = [
      kit.screenCall(magnet, brief, stored),
      kit.writerCall(magnet, brief, stored),
      kit.followUpCall(magnet, brief, full),
    ].filter(Boolean);
    const worst = calls.reduce((sum, call) => sum + kit.worstCaseMicroUsd(call), 0);
    worstTotal += worst;
    runs.push({ name, id });
    console.log(`  ${name}: at most ${dollars(worst)} (${calls.length} calls)`);
  }
  const vars = devVars();
  const capSetting = process.env.MAGNET_DAILY_CAP_USD ?? vars.MAGNET_DAILY_CAP_USD;
  const cap = kit.capMicroUsd(capSetting);
  console.log(`  Total: at most ${dollars(worstTotal)}. Cap for this run: ${dollars(cap)}.`);

  if (!flags.spend) return console.log("\nNo call made. Add --spend to run it on the Claude API.");
  const key = process.env.ANTHROPIC_API_KEY ?? vars.ANTHROPIC_API_KEY;
  if (!key) console.log("No ANTHROPIC_API_KEY: using the `ant auth login` sign-in.\n");
  if (worstTotal > cap)
    stop("The worst case is above the cap. Run one file with --fixture=<name>, or raise the cap.");

  const env = { DB: db, MAGNET_DRAFTS: "1", MAGNET_DAILY_CAP_USD: capSetting };
  const deps = {
    now,
    caller: kit.callerFor(kit.anthropicClient(key)),
    alert: async () => {},
    mail: null,
    origin: async () => null,
  };
  const out = join(folderOf(slug), "review");
  mkdirSync(out, { recursive: true });
  let spent = 0;
  for (const { name, id } of runs) {
    console.log(`\n${name}: writing...`);
    let outcome = await kit.runLead(env, id, deps);
    for (let tries = 1; outcome === "retry" && tries < 3; tries++)
      outcome = await kit.runLead(env, id, deps);
    const lessons = outcome === "done" ? await kit.writeFollowUps(env, id, deps) : "not run";
    const lead = await kit.getLead(db, id);
    const emails = await db
      .prepare(
        "SELECT step, due_at, subject, body FROM magnet_emails WHERE lead_id = ? ORDER BY step",
      )
      .bind(id)
      .all();
    const file = join(out, `${name}.md`);
    writeFileSync(file, `${reviewPage(name, lead, emails.results, outcome, lessons)}\n`);
    spent += lead.costMicroUsd;
    console.log(`  ${outcome}, lesson emails ${lessons}, ${dollars(lead.costMicroUsd)}: ${file}`);
  }
  console.log(
    `\nSpent ${dollars(spent)} on ${runs.length} test ${runs.length === 1 ? "run" : "runs"}.`,
  );
}

// --- main ------------------------------------------------------------------------------

async function main() {
  const [command, slug, ...rest] = process.argv.slice(2);
  const flags = {
    remote: rest.includes("--remote"),
    spend: rest.includes("--spend"),
    fixture: rest.find((arg) => arg.startsWith("--fixture="))?.slice("--fixture=".length),
  };
  if (!["new", "check", "push", "review"].includes(command ?? "") || !slug) stop(USAGE);
  if (!SLUG.test(slug)) stop("A slug is lower-case words joined by dashes, like profile-plan.");

  if (command === "new") return create(slug);
  const kit = await loadKit();
  if (command === "push") return push(kit, slug, flags.remote);
  if (command === "review") return review(kit, slug, flags);

  const { problems } = problemsOf(kit, slug);
  if (problems.length > 0) {
    report(problems);
    stop(`${problems.length} to fix.`);
  }
  console.log(`ok: "${slug}" is ready to push and review.`);
}

main().catch((error) => {
  if (!(error instanceof Stop)) throw error;
  console.error(error.message);
  process.exitCode = 1;
});
