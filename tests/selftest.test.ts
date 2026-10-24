import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BuildInfo, Env } from "../src/lib/env";
import { handleSelftest } from "../src/lib/selftest";
import { NOTION_VERSION, leadProperties } from "../src/lib/notion";

const KEY = "k".repeat(32);
const preview: BuildInfo = {
  branch: "claude/build",
  branchSource: "WORKERS_CI_BRANCH",
  commit: "abc123",
};
const env: Env = {
  ASSETS: {} as Fetcher,
  NOTION_TOKEN: "notion-secret",
  NOTION_DATABASE_ID: "db-id",
  RESEND_API_KEY: "resend-secret",
  ALERT_EMAIL: "me@example.com",
  SELFTEST_KEY: KEY,
};

const req = (headers: Record<string, string> = {}, method = "GET") =>
  new Request("https://x.workers.dev/api/selftest", { method, headers });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async (url: string) =>
    url.includes("notion.com")
      ? Response.json({ id: "page-123" })
      : Response.json({ id: "email-456" }),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function expectRefused(res: Promise<Response>) {
  const r = await res;
  expect(r.status).toBe(404);
  expect(await r.text()).toBe("Not found");
  expect(fetchMock).not.toHaveBeenCalled();
}

describe("self-test refuses with an identical 404", () => {
  it("no header", async () => expectRefused(handleSelftest(req(), env, preview)));
  it("wrong header", async () =>
    expectRefused(handleSelftest(req({ "X-Selftest-Key": "x".repeat(32) }), env, preview)));
  it("key secret too short", async () =>
    expectRefused(
      handleSelftest(
        req({ "X-Selftest-Key": "short" }),
        { ...env, SELFTEST_KEY: "short" },
        preview,
      ),
    ));
  it("key secret not set", async () =>
    expectRefused(
      handleSelftest(req({ "X-Selftest-Key": KEY }), { ...env, SELFTEST_KEY: undefined }, preview),
    ));
  it("on main, even with the right key", async () =>
    expectRefused(
      handleSelftest(req({ "X-Selftest-Key": KEY }), env, { ...preview, branch: "main" }),
    ));
  it("on an unknown branch, even with the right key", async () =>
    expectRefused(
      handleSelftest(req({ "X-Selftest-Key": KEY }), env, {
        ...preview,
        branch: "unknown",
        branchSource: "none",
      }),
    ));
  it("wrong method", async () =>
    expectRefused(handleSelftest(req({ "X-Selftest-Key": KEY }, "POST"), env, preview)));
});

describe("self-test with the right key on a preview", () => {
  it("writes to Notion, sends the email and reports ids", async () => {
    const res = await handleSelftest(req({ "X-Selftest-Key": KEY }), env, preview);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      branch: "claude/build",
      branchSource: "WORKERS_CI_BRANCH",
      commit: "abc123",
      notion: { ok: true, pageId: "page-123", version: NOTION_VERSION },
      resend: { ok: true, id: "email-456" },
    });

    const [[notionUrl, notionInit], [resendUrl, resendInit]] = fetchMock.mock.calls;
    expect(notionUrl).toBe("https://api.notion.com/v1/pages");
    expect(notionInit.headers["Notion-Version"]).toBe("2022-06-28");
    expect(notionInit.headers.Authorization).toBe("Bearer notion-secret");
    const notionBody = JSON.parse(notionInit.body);
    expect(notionBody.parent).toEqual({ database_id: "db-id" });
    expect(Object.keys(notionBody.properties).sort()).toEqual([
      "Business",
      "Email",
      "Goal",
      "Instagram",
      "Name",
      "Referrer",
      "Source",
      "Status",
      "Submitted",
    ]);
    expect(notionBody.properties.Name.title[0].text.content).toMatch(/^TEST selftest /);
    expect(notionBody.properties.Status).toEqual({ select: { name: "New" } });

    expect(resendUrl).toBe("https://api.resend.com/emails");
    expect(resendInit.headers.Authorization).toBe("Bearer resend-secret");
    expect(JSON.parse(resendInit.body).to).toEqual(["me@example.com"]);
  });

  it("reports a Notion failure without leaking the response body", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("notion.com")
        ? Response.json({ code: "validation_error", message: "secret detail" }, { status: 400 })
        : Response.json({ id: "email-456" }),
    );
    const res = await handleSelftest(req({ "X-Selftest-Key": KEY }), env, preview);
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(text).toContain("notion 400 validation_error");
    expect(text).not.toContain("secret detail");
    expect(text).not.toContain("notion-secret");
  });

  it("names a missing binding without calling the API", async () => {
    const res = await handleSelftest(
      req({ "X-Selftest-Key": KEY }),
      { ...env, RESEND_API_KEY: undefined },
      preview,
    );
    const body = (await res.json()) as { resend: { error: string } };
    expect(body.resend.error).toBe("missing RESEND_API_KEY");
    expect(fetchMock.mock.calls.every(([u]) => String(u).includes("notion.com"))).toBe(true);
  });
});

describe("leadProperties", () => {
  it("leaves optional text empty instead of sending blank content", () => {
    const p = leadProperties({
      name: "A",
      email: "a@b.co",
      instagram: "@a",
      business: "B",
      source: "ig",
      submittedAt: "2026-10-24T00:00:00.000Z",
    });
    expect(p.Goal.rich_text).toEqual([]);
    expect(p.Referrer.rich_text).toEqual([]);
  });
});
