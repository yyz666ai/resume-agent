import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { demoResume } from "../src/model.js";
const doc = demoResume();
doc.sections.experience.items[0].body =
  "<ol><li>分析产品需求，推动版本交付。</li><li>整理用户反馈，完善产品体验。</li><li>完成产品原型，验证关键流程。</li></ol>";
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
const errors = [];
let calls = [];
p.on("pageerror", (e) => errors.push(e.message));
await fs.mkdir(".private", { recursive: true });
await p.addInitScript((d) => {
  if (!localStorage.getItem("zhijian.library.v1"))
    localStorage.setItem("zhijian.resume.v1", JSON.stringify(d));
}, doc);
await p.route("**/api/harness/status", (r) =>
  r.fulfill({
    json: {
      apiVerified: true,
      configuration: { hasKey: true, model: "deepseek-flash" },
      capabilities: { images: true },
    },
  }),
);
await p.route("**/api/agent", (r) => {
  const value = r.request().postDataJSON();
  calls.push(value);
  const items = structuredClone(value.document.sections.experience.items);
  items.find((x) => x.id === value.target.entryId).body =
    "<ol><li>梳理产品需求并推动版本交付。</li><li>基于用户反馈改进体验。</li><li>设计原型并验证关键流程。</li></ol>";
  return r.fulfill({
    json: {
      proposal: {
        message: "已完成润色",
        changes: [{ section: "experience", items }],
        target: value.target,
      },
    },
  });
});
const read = () =>
  p.evaluate(() => JSON.parse(localStorage.getItem("zhijian.resume.v1")));
try {
  await p.goto("http://localhost:4173");
  await p.locator(".home-agent").waitFor();
  assert.equal(await p.locator(".home-resume-card").count(), 0);
  assert.equal(
    await p.locator(".portal-sidebar nav button").first().innerText(),
    "简历Agent",
  );
  await p.getByRole("button", { name: "我的简历", exact: true }).click();
  await p.locator(".home-resume-card").waitFor();
  assert.equal(await p.locator(".home-agent").count(), 0);
  await p.locator(".resume-thumbnail").first().click();
  await p.locator(".editor-panel").waitFor();
  assert.equal(
    await p.getByRole("button", { name: "导入简历", exact: true }).count(),
    0,
  );
  assert.equal(await p.getByLabel("更多导出选项").count(), 0);
  assert.ok((await p.locator(".topbar").boundingBox()).height <= 58);
  assert.ok((await p.locator(".editor-panel").boundingBox()).width <= 350);
  let body = p
    .locator('.resume-page [data-section="experience"]')
    .first()
    .locator('[data-inline-field="body"]');
  assert.equal(await body.count(), 1);
  assert.equal(await body.locator("ol").count(), 1);
  assert.equal(await body.locator("li").count(), 3);
  await body.locator("li").first().click();
  await p.keyboard.press("End");
  await p.keyboard.type(" 补充事实");
  await p.locator(".preview-toolbar").click();
  await p.waitForTimeout(500);
  assert.match((await read()).sections.experience.items[0].body, /补充事实/);
  assert.equal(
    await p.getByRole("button", { name: "完成编辑", exact: true }).count(),
    0,
  );
  assert.equal(await p.locator(".paper-inline-tools").count(), 0);
  const name = p.locator('.resume-page [data-inline-field="name"]').first();
  await name.click();
  assert.equal(await p.locator(".paper-inline-tools").count(), 0);
  await name.fill("测试姓名");
  await p.locator(".preview-toolbar").click();
  await p.waitForTimeout(500);
  assert.equal((await read()).basics.name, "测试姓名");
  assert.equal(await p.locator(".basic-info .basic-input button").count(), 0);
  await name.click();
  await p.getByLabel("从预览隐藏name", { exact: true }).click();
  await p.waitForTimeout(500);
  assert.equal(await p.locator(".resume-page h1").count(), 0);
  assert.ok(
    !(await p.locator(".resume-page").first().innerText()).includes("测试姓名"),
  );
  assert.equal(
    await p.getByLabel("姓名", { exact: true }).inputValue(),
    "测试姓名",
  );
  await p
    .locator(".hidden-basic-fields")
    .getByRole("button", { name: "姓名", exact: true })
    .click();
  await name.waitFor();
  const email = p
    .locator(".resume-page .resume-contact-item")
    .filter({ has: p.locator('[data-inline-field="email"]') });
  const before = await email.boundingBox();
  await p
    .locator(".resume-page .resume-contact-item")
    .filter({ has: p.locator('[data-inline-field="phone"]') })
    .locator('[data-inline-field="phone"]')
    .click();
  await p.getByLabel("从预览隐藏phone", { exact: true }).click();
  await p.waitForTimeout(500);
  assert.equal(
    await p.locator('.resume-page [data-inline-field="phone"]').count(),
    0,
  );
  assert.ok((await email.boundingBox()).x < before.x);
  assert.equal((await read()).basics.phone, doc.basics.phone);
  await p
    .locator(".hidden-basic-fields")
    .getByRole("button", { name: "电话", exact: true })
    .click();
  await p.locator('.resume-page [data-inline-field="phone"]').waitFor();
  await body.click();
  assert.equal(await p.locator(".compose-box .selection-chip").count(), 1);
  assert.ok((await p.locator(".selection-chip").boundingBox()).height < 35);
  await p
    .getByRole("toolbar", { name: "纸面编辑工具" })
    .getByRole("button", { name: "AI生成", exact: true })
    .click();
  assert.equal(calls.length, 0);
  await p.waitForFunction(
    () =>
      document.querySelector('textarea[aria-label="给简历助手发送消息"]').value
        .length > 0,
  );
  await body.click();
  const composer = p.getByLabel("给简历助手发送消息", { exact: true });
  await composer.click();
  await composer.fill("请润色选中的工作经历");
  assert.match(await p.locator(".compose-box .selection-chip").innerText(), /工作经历/);
  await p.getByRole("button", { name: "发送消息", exact: true }).click();
  const regenerate = p.getByRole("button", { name: "重新生成", exact: true });
  const undoChange = p.getByRole("button", { name: "撤回本次修改", exact: true });
  const paper = p.locator(".preview-panel .resume-page");
  await regenerate.waitFor();
  const beforePolish = calls[0].document;
  await p.waitForTimeout(550);
  assert.match((await read()).sections.experience.items[0].body, /梳理产品/);
  assert.match(await paper.first().innerText(), /梳理产品/);
  assert.equal(calls[0].target.entryId, doc.sections.experience.items[0].id);
  assert.ok(await p.getByLabel("给简历助手发送消息").isEnabled());
  assert.ok(await body.isEditable());
  await regenerate.click();
  await p.waitForFunction(() => document.querySelector(".chat-change button")?.disabled === false);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].document, beforePolish);
  await undoChange.click();
  assert.doesNotMatch(await paper.first().innerText(), /梳理产品/);
  await p.waitForTimeout(550);
  assert.deepEqual(await read(), beforePolish);
  await p.screenshot({ path: ".private/refined-editor.png", fullPage: true });
  assert.equal(await p.locator(".topbar .language-switcher").count(), 0);
  await p.getByRole("button", { name: "返回我的简历", exact: true }).click();
  await p.getByRole("button", { name: "Agent 设置", exact: true }).click();
  await p
    .getByLabel("界面语言 / Interface language", { exact: true })
    .selectOption("en");
  await p.getByRole("button", { name: "My resumes", exact: true }).click();
  await p.locator(".resume-thumbnail").first().click();
  await p.getByRole("button", { name: "Export PDF", exact: true }).waitFor();
  if (!(await p.getByLabel("Name", { exact: true }).isVisible()))
    await p
      .locator(".module-list > .module")
      .first()
      .locator(".module-heading")
      .click();
  await p.getByLabel("Name", { exact: true }).waitFor();
  assert.equal(await p.locator("html").getAttribute("lang"), "en");
  assert.equal((await read()).basics.name, "测试姓名");
  await p.reload();
  await p.getByRole("button", { name: "Export PDF", exact: true }).waitFor();
  await p.screenshot({
    path: ".private/refined-editor-en.png",
    fullPage: true,
  });
  assert.equal(await p.getByLabel("界面语言 / Interface language").count(), 0);
  await p
    .getByRole("button", { name: "Back to my resumes", exact: true })
    .click();
  await p.getByRole("button", { name: "Agent settings", exact: true }).click();
  await p
    .getByLabel("界面语言 / Interface language", { exact: true })
    .selectOption("zh");
  await p.getByRole("button", { name: "我的简历", exact: true }).click();
  assert.ok(p.url().endsWith("/resumes"));
  await p.getByRole("button", { name: "简历Agent", exact: true }).click();
  await p.locator(".home-agent").waitFor();
  await p.screenshot({
    path: ".private/refined-agent-page.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: separate navigation, compact editor, full-entry numbered editing, blur autosave, hidden fields reflow, direct targeted polish, generate-to-input, English UI persistence",
  );
} catch (e) {
  console.log("PAGE_ERRORS", errors);
  await p.screenshot({
    path: ".private/refinement-failure.png",
    fullPage: true,
  });
  throw e;
} finally {
  await browser.close();
}
