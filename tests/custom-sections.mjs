import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.TEST_URL || "http://localhost:4173",
  live = process.env.LIVE_DEEPSEEK === "1";
await fs.mkdir(".private", { recursive: true });
const b = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1680, height: 1050 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const read = () =>
  p.evaluate(() => JSON.parse(localStorage.getItem("zhijian.resume.v1")));
try {
  await p.goto(base + "/editor");
  await p.waitForSelector(".resume-page");
  await p
    .locator(
      '.resume-page [data-section="experience"] [data-inline-field="body"]',
    )
    .first()
    .click();
  await p
    .getByRole("toolbar", { name: "纸面编辑工具" })
    .getByRole("button", { name: "AI生成", exact: true })
    .click();
  await p.getByLabel("助手修改范围").selectOption("all");
  await p.waitForTimeout(150);
  assert.equal(await p.getByLabel("助手修改范围").inputValue(), "all");

  await p.getByRole("button", { name: "添加模块", exact: true }).click();
  await p.getByLabel("新模块名称", { exact: true }).fill("志愿服务");
  await p.getByRole("button", { name: "确认添加模块", exact: true }).click();
  await p.waitForTimeout(500);
  let d = await read();
  let key = d.order.find((k) => d.sections[k].label === "志愿服务");
  assert.ok(key);
  assert.equal(
    await p
      .locator(".resume-page .resume-section-title")
      .filter({ hasText: "志愿服务" })
      .count(),
    1,
  );
  const module = p.locator("#editor-" + key);
  await module.getByText("模块格式", { exact: true }).click();
  await module.getByLabel("模块标题加粗", { exact: true }).uncheck();
  await module.getByLabel("志愿服务行距", { exact: true }).fill("1.8");
  await p.waitForTimeout(500);
  assert.equal((await read()).sections[key].format.titleBold, false);
  const weight = await p
    .locator(".resume-page .resume-section-title")
    .filter({ hasText: "志愿服务" })
    .evaluate((e) => getComputedStyle(e).fontWeight);
  assert.equal(weight, "400");
  await p.reload();
  await p.waitForSelector(".resume-page");
  assert.ok((await read()).sections[key]);
  await p
    .locator("#editor-" + key)
    .locator(".module-title-button")
    .click();
  p.once("dialog", (dialog) => dialog.accept());
  await p
    .getByRole("button", { name: "删除此自定义模块", exact: true })
    .click();
  await p.waitForTimeout(500);
  assert.ok(!(await read()).sections[key]);
  await p.getByTitle("撤销", { exact: true }).click();
  await p.waitForTimeout(500);
  assert.ok((await read()).sections[key]);
  console.log(
    "PASS: manual module add, render, local formatting, persistence, delete and undo",
  );
  if (live) {
    const check = await p.request.post(base + "/api/harness/connect", {
      data: {},
      timeout: 145000,
    });
    assert.equal(check.status(), 200);
    await p.reload();
    await p.waitForSelector(".resume-page");
    await p.getByLabel("助手修改范围").selectOption("all");
    await p
      .getByLabel("给简历助手发送消息")
      .fill(
        "请新增一个空白的“培训经历”模块，放在专业技能后，不编造任何经历。将整份简历行距设为1.8。将项目经历的模块标题设为不加粗，项目条目标题加粗。只修改模块结构和格式，不改现有正文。",
      );
    const pending = p.waitForResponse((r) => r.url().endsWith("/api/agent"), {
      timeout: 145000,
    });
    await p.getByLabel("发送消息", { exact: true }).click();
    const r = await pending;
    const data = await r.json();
    assert.equal(r.status(), 200, data.error);
    await p.getByRole("button", { name: "撤回本次修改", exact: true }).waitFor();
    await p.waitForTimeout(600);
    d = await read();
    const training = d.order.find((k) => d.sections[k].label === "培训经历");
    assert.ok(training);
    assert.equal(
      await p
        .locator(
          `.resume-page [data-section="${training}"] .resume-section-title`,
        )
        .count(),
      1,
    );
    assert.equal(d.style.lineHeight, 1.8);
    assert.equal(d.sections.projects.format.titleBold, false);
    assert.equal(d.sections.projects.format.entryTitleBold, true);
    assert.equal(d.order.indexOf(training), d.order.indexOf("skills") + 1);
    assert.equal(
      await p
        .locator(
          '.resume-page .resume-piece[data-section="projects"] .resume-section-title',
        )
        .evaluate((e) => getComputedStyle(e).fontWeight),
      "400",
    );
    console.log(
      "LIVE PASS: genuine DeepSeek added a new module, set global spacing and specific module/entry heading weight",
    );
  }
  const doc = await read();
  const result = await p.request.post(base + "/api/export", {
    data: { document: doc },
    timeout: 60000,
  });
  assert.equal(result.status(), 200);
  await fs.writeFile(".private/custom-sections.pdf", await result.body());
  await p.screenshot({ path: ".private/custom-sections.png" });
  assert.deepEqual(errors, []);
  console.log("PASS: custom module PDF export and no browser errors");
} finally {
  await b.close();
}
