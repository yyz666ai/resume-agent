import { chromium } from "playwright";
import assert from "node:assert/strict";
const b = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const p = await b.newPage({ viewport: { width: 1512, height: 982 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://localhost:4173/editor");
  await p.waitForTimeout(300);
  if (!(await p.getByLabel("DeepSeek API Key").isVisible()))
    await p.getByLabel("Harness 设置").click();
  await p.getByLabel("DeepSeek API Key").waitFor();
  assert.equal(
    await p.getByLabel("DeepSeek API Key").getAttribute("type"),
    "password",
  );
  const grip = p.getByRole("separator", { name: "调整助手宽度" });
  const before = await p
    .locator(".agent-panel")
    .evaluate((e) => e.getBoundingClientRect().width);
  const box = await grip.boundingBox();
  await p.mouse.move(box.x + 3, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x - 100, box.y + box.height / 2, { steps: 10 });
  await p.mouse.up();
  const after = await p
    .locator(".agent-panel")
    .evaluate((e) => e.getBoundingClientRect().width);
  assert.ok(after > before + 70);
  await p.reload();
  await p.waitForTimeout(300);
  if (!(await p.getByLabel("DeepSeek API Key").isVisible()))
    await p.getByLabel("Harness 设置").click();
  await p.getByLabel("DeepSeek API Key").waitFor();
  assert.equal(
    await p
      .locator(".agent-panel")
      .evaluate((e) => e.getBoundingClientRect().width),
    after,
  );
  assert.equal(
    await p.evaluate(() =>
      Object.keys(localStorage).some((k) => /api.key|secret/i.test(k)),
    ),
    false,
  );
  await p.screenshot({ path: ".private/api-config.png" });
  console.log(
    "PASS: API password input, draggable panel, width persistence, no credential browser storage, no JS errors",
  );
  assert.deepEqual(errors, []);
  const status = await (
    await p.request.get("http://localhost:4173/api/harness/status")
  ).json();
  console.log(
    "CONFIG_STATE",
    JSON.stringify({
      hasKey: status.configuration.hasKey,
      apiVerified: status.apiVerified,
    }),
  );
  if (!status.configuration.hasKey) {
    await p.getByRole("button", { name: "保存并测试回答" }).click();
    await p.getByRole("alert").waitFor({ timeout: 45000 });
    console.log("LIVE_REPLY_CHECK", await p.getByRole("alert").innerText());
    const result = await (
      await p.request.get("http://localhost:4173/api/harness/status")
    ).json();
    assert.equal(result.apiVerified, false);
    console.log(
      "PASS: unavailable API does not appear as a successful model connection",
    );
  }
} finally {
  await b.close();
}
