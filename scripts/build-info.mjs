// Records which branch and commit this build is from, so the Worker and the
// pages can tell a preview from production. Runs before every build.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

function git(...args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/** Branch name from Workers Builds, else from git, else "unknown". */
export function resolveBranch(env, readGit = git) {
  const fromCi = (env.WORKERS_CI_BRANCH ?? "").trim();
  if (fromCi) return { branch: fromCi, branchSource: "WORKERS_CI_BRANCH" };
  const fromGit = readGit("rev-parse", "--abbrev-ref", "HEAD");
  if (fromGit && fromGit !== "HEAD") return { branch: fromGit, branchSource: "git" };
  return { branch: "unknown", branchSource: "none" };
}

export function resolveCommit(env, readGit = git) {
  const fromCi = (env.WORKERS_CI_COMMIT_SHA ?? "").trim();
  return (fromCi || readGit("rev-parse", "HEAD") || "unknown").slice(0, 12);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const info = { ...resolveBranch(process.env), commit: resolveCommit(process.env) };
  mkdirSync("src/generated", { recursive: true });
  writeFileSync("src/generated/build-info.json", JSON.stringify(info, null, 2) + "\n");
  console.log(`build-info: branch=${info.branch} source=${info.branchSource} commit=${info.commit}`);
}
