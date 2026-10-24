import { describe, expect, it } from "vitest";
import { resolveBranch, resolveCommit } from "../scripts/build-info.mjs";

describe("resolveBranch", () => {
  it("uses WORKERS_CI_BRANCH first", () => {
    expect(resolveBranch({ WORKERS_CI_BRANCH: "claude/build" }, () => "other")).toEqual({
      branch: "claude/build",
      branchSource: "WORKERS_CI_BRANCH",
    });
  });
  it("falls back to git when the variable is missing", () => {
    expect(resolveBranch({}, () => "feature-x")).toEqual({
      branch: "feature-x",
      branchSource: "git",
    });
  });
  it("ignores an empty variable", () => {
    expect(resolveBranch({ WORKERS_CI_BRANCH: "  " }, () => "feature-x").branchSource).toBe("git");
  });
  it("returns unknown on a detached HEAD", () => {
    expect(resolveBranch({}, () => "HEAD")).toEqual({ branch: "unknown", branchSource: "none" });
  });
  it("returns unknown when git fails", () => {
    expect(resolveBranch({}, () => "")).toEqual({ branch: "unknown", branchSource: "none" });
  });
});

describe("resolveCommit", () => {
  it("shortens the commit", () => {
    expect(resolveCommit({ WORKERS_CI_COMMIT_SHA: "0123456789abcdef" }, () => "")).toBe(
      "0123456789ab",
    );
  });
});
