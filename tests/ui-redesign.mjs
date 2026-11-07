import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { demoResume, item } from "../src/model.js";
const d = demoResume();
d.basics.gender = "男";
d.basics.birthday = "1999-11";
d.basics.hometown = "北京";
d.sections.awards.visible = true;
d.sections.awards.items = [
  item("", "<p>科研创新奖学金</p><p>数学建模一等奖</p>"),
  item("", "<p>全国物理实验竞赛三等奖</p>"),
];
d.sections.certificates.visible = true;
d.sections.certificates.items = [item("", "<p>CET-6</p>")];
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
await p.addInitScript((data) => {
  if (!localStorage.getItem("zhijian.library.v1"))
    localStorage.setItem("zhijian.resume.v1", JSON.stringify(data));
}, d);
const read = () =>
  p.evaluate(() => JSON.parse(localStorage.getItem("zhijian.resume.v1")));
try {
  await p.goto("http://localhost:4173/editor");
  await p.waitForSelector(".resume-page");
  assert.equal(await p.title(), "AI简历");
  assert.equal(
    await p.getByRole("toolbar", { name: "纸面编辑工具" }).count(),
    0,
  );
  assert.equal(await p.locator(".agent-connection").count(), 0);
  assert.equal(
    await p.locator(".agent-heading .agent-status-light").count(),
    1,
  );
  await p.getByLabel("修改简历名称").click();
  await p.getByLabel("简历名称", { exact: true }).fill("产品经理投递版");
  await p.getByLabel("简历名称", { exact: true }).press("Enter");
  await p.reload();
  await p.waitForSelector(".resume-page");
  assert.match(
    await p.getByLabel("修改简历名称").innerText(),
    /产品经理投递版/,
  );
  assert.equal(await p.locator(".basic-info .basic-input button").count(), 0);
  await p.locator('.resume-page [data-inline-field="email"]').click();
  await p.getByLabel("从预览隐藏email", { exact: true }).click();
  assert.equal(
    await p.getByLabel("电子邮箱", { exact: true }).inputValue(),
    "hello@example.com",
  );
  assert.equal(
    await p
      .locator(".resume-page .resume-contact-item")
      .filter({ hasText: "hello@example.com" })
      .count(),
    0,
  );
  assert.equal((await read()).basics.email, "hello@example.com");
  await p
    .locator(".hidden-basic-fields")
    .getByRole("button", { name: "邮箱", exact: true })
    .click();
  assert.equal(
    await p
      .locator(".resume-page .resume-contact-item")
      .filter({ hasText: "hello@example.com" })
      .count(),
    1,
  );
  assert.ok(
    (await p.locator(".resume-page .resume-contact-item svg").count()) >= 4,
  );
  await p.getByRole("button", { name: "简历模板", exact: true }).click();
  await p.getByRole("button", { name: /现代侧栏/ }).click();
  await p.getByRole("button", { name: "内容编辑", exact: true }).click();
  const name = p.locator(
    '.resume-page .resume-side [data-inline-field="name"]',
  );
  await name.click();
  await p.waitForTimeout(150);
  assert.equal(await name.evaluate((e) => document.activeElement === e), true);
  await name.fill("侧栏姓名验证");
  await p.locator(".preview-toolbar").click();
  await p.waitForTimeout(500);
  assert.equal(
    await p.getByRole("toolbar", { name: "纸面编辑工具" }).count(),
    0,
  );
  assert.equal((await read()).basics.name, "侧栏姓名验证");
  const skills = p.locator(
    '.resume-page .resume-side [data-section="skills"] [data-inline-field="body"]',
  );
  await skills.click();
  await skills.press("End");
  await p.keyboard.type(" SIDEBAR_OK");
  await p.locator(".preview-toolbar").click();
  await p.waitForTimeout(500);
  assert.ok(
    (await read()).sections.skills.items[0].body.includes("SIDEBAR_OK"),
  );
  await p.locator(".preview-toolbar").click();
  assert.equal(
    await p.getByRole("toolbar", { name: "纸面编辑工具" }).count(),
    0,
  );
  await p.locator("#editor-awards .module-title-button").click();
  await p.getByLabel("添加所获荣誉标签", { exact: true }).fill("校级奖学金");
  await p.getByLabel("添加所获荣誉标签", { exact: true }).press("Enter");
  await p.waitForTimeout(500);
  assert.equal(
    await p.locator('.resume-page [data-section="awards"] .resume-tag').count(),
    4,
  );
  await p.locator("#editor-certificates .module-title-button").click();
  await p.getByLabel("添加资格证书标签", { exact: true }).fill("PMP");
  await p.getByLabel("添加资格证书标签", { exact: true }).press("Enter");
  await p.waitForTimeout(500);
  assert.equal(
    await p
      .locator('.resume-page [data-section="certificates"] .resume-tag')
      .count(),
    2,
  );
  await p.screenshot({ path: ".private/ai-resume-redesign.png" });
  await p.getByLabel("Harness 设置").click();
  await p.locator(".agent-config .agent-connection").waitFor();
  await p.getByLabel("Harness 设置").click();
  assert.equal(await p.locator(".agent-connection").count(), 0);
  const r = await p.request.post("http://localhost:4173/api/export", {
    data: { document: await read() },
    timeout: 60000,
  });
  assert.equal(r.status(), 200, await r.text().then((t) => t.slice(0, 100)));
  await fs.writeFile(".private/ai-resume-redesign.pdf", await r.body());
  assert.deepEqual(errors, []);
  console.log(
    "PASS: AI简历 branding, rename persistence, hide/restore, icons, stable sidebar editing, toolbar dismissal, award/certificate tags, compact API status and PDF export",
  );
} finally {
  await b.close();
}
