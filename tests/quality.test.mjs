import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("client auth does not ship password-based preview credentials", async () => {
  const authSource = await read("frontend/src/hooks/useAuth.ts");
  const appSource = await read("frontend/src/App.tsx");
  const previewConfigSource = await read("frontend/src/config/preview.ts");
  const combined = `${authSource}\n${appSource}`;

  assert.equal(combined.includes("Password123"), false);
  assert.equal(combined.includes("customer.demo@finguard.ai"), false);
  assert.equal(combined.includes("DEMO_USERS"), false);
  assert.match(previewConfigSource, /VITE_ENABLE_PREVIEW_ACCESS/);
  assert.match(appSource, /startPreviewSession/);
});

test("preview workspace data stays outside the main app shell", async () => {
  const appSource = await read("frontend/src/App.tsx");
  const previewSource = await read("frontend/src/data/previewWorkspace.ts");

  for (const forbidden of ["demoAccounts", "demoTransactions", "demoDisputes", "demoAuditorCustomers"]) {
    assert.equal(appSource.includes(forbidden), false);
  }

  assert.equal(appSource.includes('from "./data/previewWorkspace"'), false);
  assert.match(appSource, /loadPreviewWorkspaceData/);
  assert.match(previewSource, /createPreviewWorkspaceData/);
});

test("support fallback keeps the current B2B risk-review positioning", async () => {
  const backendSupport = await read("backend/src/modules/ai-agent/openai.service.ts");
  const frontendSupport = await read("frontend/src/support/localSupport.ts");

  for (const source of [backendSupport, frontendSupport]) {
    assert.equal(source.includes("reset is unavailable in the demo"), false);
    assert.equal(source.includes("demo assistant"), false);
    assert.equal(source.includes("Create account"), false);
    assert.match(source, /review workspace|payment activity|evidence|risk actions/);
  }
});

test("frontend API responses are typed through a shared envelope", async () => {
  const apiSource = await read("frontend/src/services/api.ts");

  assert.match(apiSource, /type ApiEnvelope<T>/);
  assert.match(apiSource, /apiData<T>/);
  assert.match(apiSource, /get<ApiEnvelope<Transaction\[\]>>/);
  assert.match(apiSource, /post<ApiEnvelope<Dispute>>/);
  assert.equal(apiSource.includes("response.data.data as"), false);
});

test("backend console output is centralized through the logger", async () => {
  const serverSource = await read("backend/src/server.ts");
  const supportSource = await read("backend/src/modules/support/support.router.ts");
  const aiSource = await read("backend/src/modules/ai-agent/openai.service.ts");
  const loggerSource = await read("backend/src/lib/logger.ts");

  for (const source of [serverSource, supportSource, aiSource]) {
    assert.equal(/console\.(log|info|warn|error|debug)/.test(source), false);
  }

  assert.match(loggerSource, /console\.(error|warn|info)/);
});

test("browser storage keys are centralized and guarded", async () => {
  const appSource = await read("frontend/src/App.tsx");
  const authSource = await read("frontend/src/hooks/useAuth.ts");
  const socketSource = await read("frontend/src/hooks/useSocket.ts");
  const storageSource = await read("frontend/src/config/storage.ts");

  for (const source of [appSource, authSource, socketSource]) {
    assert.equal(source.includes("localStorage."), false);
    assert.equal(source.includes('"finguard_token"'), false);
  }

  assert.match(storageSource, /AUTH_TOKEN_KEY/);
  assert.match(storageSource, /try \{/);
});
