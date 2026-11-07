import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createSettingsStore } from "../server/settings.js";
test("API configuration persists without returning credentials", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "resume-settings-"));
  try {
    const filename = path.join(dir, ".env.harness");
    const store = createSettingsStore(filename);
    assert.equal((await store.status()).hasKey, false);
    await assert.rejects(
      store.save({ apiKey: "", model: "deepseek-flash" }),
      /API Key/,
    );
    const result = await store.save({
      apiKey: "test-only-not-a-real-credential",
      model: "deepseek-flash",
    });
    assert.equal(result.hasKey, true);
    assert.ok(!JSON.stringify(result).includes("test-only"));
    assert.equal((await stat(filename)).mode & 0o777, 0o600);
    const reloaded = createSettingsStore(filename);
    assert.equal((await reloaded.status()).hasKey, true);
    assert.equal(
      (await reloaded.environment()).DEEPSEEK_API_KEY,
      "test-only-not-a-real-credential",
    );
    await reloaded.save({ apiKey: "", model: "deepseek-v4-pro" });
    assert.equal((await reloaded.status()).model, "deepseek-v4-pro");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
