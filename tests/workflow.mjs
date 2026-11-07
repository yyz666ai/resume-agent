import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const sample = process.env.TEST_PDF;
if (!sample) throw Error("请通过 TEST_PDF 提供至少包含两条工作经历的测试简历");
const live = process.env.LIVE_DEEPSEEK === "1";
const base = process.env.TEST_URL || "http://localhost:4173";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const read = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("zhijian.resume.v1")));
try {
  if (!live)
    await page.route("**/api/import?mode=ai", async (route) => {
      await route.fulfill({ response: await route.fetch({ url: base + "/api/import" }) });
    });
  if (live) {
    const check = await page.request.post(base + "/api/harness/connect", {
      data: {},
      timeout: 140000,
    });
    const checked = await check.json();
    assert.equal(check.status(), 200, checked.error);
    console.log("LIVE: genuine DeepSeek greeting received");
  }
  await page.goto(base + "/editor");
  await page.waitForSelector(".resume-page");
  assert.equal(await page.locator(".resume-library").count(), 0);
  await page
    .locator('input[type=file][accept=".pdf,.json"]')
    .setInputFiles(sample);
  await page.getByRole("button", { name: "确认导入，开始编辑" }).click();
  await page.waitForTimeout(600);
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zhijian.library.v1")).entries.length,
    ),
    2,
  );
  const imported = await read();
  assert.equal(imported.sections.experience.items.length, 2);
  let piece = page.locator('.resume-page [data-section="experience"]').first();
  const title = piece.locator('[data-inline-field="title"]');
  await title.click();
  await title.fill(imported.sections.experience.items[0].title + " 排版验证");
  await page.locator(".preview-toolbar").click();
  await page.waitForTimeout(600);
  assert.match((await read()).sections.experience.items[0].title, /排版验证/);
  const output = await page.request.post(base + "/api/export", {
    data: { document: await read() },
    timeout: 60000,
  });
  assert.equal(output.status(), 200);
  await fs.writeFile(".private/live-inline-edit.pdf", await output.body());
  await page.getByTitle("撤销", { exact: true }).click();
  await page.waitForTimeout(500);
  assert.deepEqual(await read(), imported);
  console.log(
    "PASS: original PDF import, preview popup edits correct entry, export and undo",
  );
  piece = page.locator('.resume-page [data-section="experience"]').first();
  await piece.scrollIntoViewIfNeeded();
  await piece.evaluate((el) => {
    const content = el.querySelector(".resume-rich");
    const range = document.createRange();
    range.selectNodeContents(content);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const box = content.getBoundingClientRect();
    content.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        clientX: box.left + 100,
        clientY: box.top + 10,
      }),
    );
  });
  await page
    .getByRole("toolbar", { name: "纸面编辑工具" })
    .getByRole("button", { name: "AI生成", exact: true })
    .click();
  assert.ok(
    (await page.locator(".selection-chip").innerText()).includes(
      imported.sections.experience.items[0].title,
    ),
  );
  assert.equal(
    await page.getByLabel("助手修改范围").inputValue(),
    "experience",
  );
  if (live) {
    await page
      .getByLabel("给简历助手发送消息")
      .fill(
        "仅精简这条工作经历的描述，保持公司、职位、日期和事实不变，不编造数据；不修改其他经历。",
      );
    const response = page.waitForResponse(
      (r) => r.url().endsWith("/api/agent") && r.request().method() === "POST",
      { timeout: 145000 },
    );
    await page.getByLabel("发送消息", { exact: true }).click();
    const result = await response;
    const data = await result.json();
    assert.equal(result.status(), 200, data.error);
    assert.equal(
      data.proposal.target.entryId,
      imported.sections.experience.items[0].id,
    );
    await page.getByRole("button", { name: "撤回本次修改", exact: true }).waitFor();
    await page.waitForTimeout(600);
    const updated = await read();
    assert.notEqual(
      updated.sections.experience.items[0].body,
      imported.sections.experience.items[0].body,
    );
    assert.deepEqual(
      updated.sections.experience.items[1],
      imported.sections.experience.items[1],
    );
    for (const k of Object.keys(imported.sections))
      if (k !== "experience")
        assert.deepEqual(updated.sections[k], imported.sections[k]);
    await page.getByTitle("撤销", { exact: true }).click();
    await page.waitForTimeout(500);
    assert.deepEqual(await read(), imported);
    console.log(
      "LIVE PASS: selected text -> star quote -> genuine DeepSeek proposal -> apply only targeted entry -> undo; other entries unchanged",
    );
  }

  await page.getByRole("button", { name: "返回我的简历" }).click();
  await page.getByRole("button", { name: "新建简历", exact: true }).click();
  await page.getByLabel("姓名", { exact: true }).fill("独立版本验证");
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "返回我的简历" }).click();
  assert.equal(await page.locator(".home-resume-card").count(), 3);
  await page
    .locator(".home-resume-card")
    .getByRole("button", { name: "编辑简历 新简历", exact: true })
    .click();
  await page.waitForTimeout(500);
  assert.equal((await read()).basics.name, "独立版本验证");
  await page.reload();
  await page.waitForSelector(".resume-page");
  assert.equal((await read()).basics.name, "独立版本验证");
  await page.getByRole("button", { name: "返回我的简历" }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .locator(".home-resume-card")
    .getByRole("button", { name: "删除简历 新简历", exact: true })
    .click();
  assert.equal(await page.locator(".home-resume-card").count(), 2);
  await page.screenshot({ path: ".private/library-and-editor.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: new resume, independent save, switch back, refresh restore, delete and no browser errors",
  );
} finally {
  await browser.close();
}
