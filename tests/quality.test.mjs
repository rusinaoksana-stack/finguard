import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("client auth does not ship password-based preview credentials", async () => {
  const authSource = await read("frontend/src/hooks/useAuth.ts");
  const appSource = await read("frontend/src/App.tsx");
  const combined = `${authSource}\n${appSource}`;

  assert.equal(combined.includes("Password123"), false);
  assert.equal(combined.includes("customer.demo@finguard.ai"), false);
  assert.equal(combined.includes("DEMO_USERS"), false);
  assert.match(authSource, /VITE_ENABLE_PREVIEW_ACCESS/);
  assert.match(appSource, /startPreviewSession/);
});

test("support fallback keeps the current B2B risk-review positioning", async () => {
  const backendSupport = await read("backend/src/modules/ai-agent/openai.service.ts");
  const frontendSupport = await read("frontend/src/App.tsx");

  for (const source of [backendSupport, frontendSupport]) {
    assert.equal(source.includes("reset is unavailable in the demo"), false);
    assert.equal(source.includes("demo assistant"), false);
    assert.equal(source.includes("Create account"), false);
    assert.match(source, /review workspace|payment activity|evidence|risk actions/);
  }
});
