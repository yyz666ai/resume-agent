import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.TEST_URL || "http://localhost:4173";
const live = process.env.LIVE_DEEPSEEK === "1";
await fs.mkdir(".private", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const fixture = await browser.newPage();
  await fixture.setContent(
    '<div style="width:480px;height:160px;background:white;border:2px solid black;display:flex;align-items:center;justify-content:center;font:64px sans-serif">PROJECT: LUMEN</div>',
  );
  await fixture.locator("div").screenshot({ path: ".private/vision-test.png" });
  await fixture.close();
  const p = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base + "/editor");
  await p.getByLabel("上传参考图片").waitFor();
  await p.waitForFunction(
    () => !document.querySelector('[aria-label="上传参考图片"]').disabled,
  );
  assert.match(
    await p.locator(".agent-model-capability").innerText(),
    /支持图片理解/,
  );
  if (live) {
    assert.match(
      await p.locator(".agent-connection").innerText(),
      /API 已配置/,
    );
    const response = p.waitForResponse(
      (r) => r.url().endsWith("/api/harness/connect"),
      { timeout: 145000 },
    );
    await p.getByLabel("测试 API 联通").click();
    const r = await response;
    const data = await r.json();
    assert.equal(r.status(), 200, data.error);
    await p.waitForFunction(() =>
      document
        .querySelector(".agent-connection")
        .textContent.includes("联通正常"),
    );
    console.log("LIVE PASS: saved API configuration and real connection test");
  }
  await p.getByLabel("选择参考图片").setInputFiles(".private/vision-test.png");
  await p.locator(".compose-attachments img").waitFor();
  assert.equal(await p.locator(".compose-attachments img").count(), 1);
  await p.getByLabel("移除图片 1").click();
  assert.equal(await p.locator(".compose-attachments img").count(), 0);
  await p.getByLabel("选择参考图片").setInputFiles(".private/vision-test.png");
  if (live) {
    await p
      .getByLabel("给简历助手发送消息")
      .fill("请读取附图中的英文项目名称，只回答读到的名称，不修改简历。");
    const response = p.waitForResponse((r) => r.url().endsWith("/api/agent"), {
      timeout: 145000,
    });
    await p.getByLabel("发送消息", { exact: true }).click();
    const r = await response;
    const data = await r.json();
    assert.equal(r.status(), 200, data.error);
    assert.match(data.proposal.message, /LUMEN/i);
    assert.equal(data.proposal.changes.length, 0);
    await p.locator(".chat-images img").waitFor();
    console.log(
      "LIVE PASS: actual DeepSeek Flash read image-only project label via Harness SDK; no resume mutation",
    );
  }
  await p.screenshot({ path: ".private/agent-images.png" });
  assert.deepEqual(errors, []);
  console.log("PASS: image preview/removal, capability label, no JS errors");
} finally {
  await browser.close();
}
