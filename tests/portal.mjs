import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const b = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1680, height: 1050 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const library = () =>
  p.evaluate(() => JSON.parse(localStorage.getItem("zhijian.library.v1")));
try {
  await p.goto("http://localhost:4173/resumes");
  await p.waitForSelector(".home-resume-card");
  await p.waitForTimeout(600);
  await p.screenshot({ path: ".private/portal-home.png", fullPage: true });
  assert.equal(await p.locator(".resume-library").count(), 0);
  const original = (await library()).entries[0];
  await p
    .getByRole("button", {
      name:
        "复制简历 " +
        (original.title || original.document.basics.name + "的简历"),
      exact: true,
    })
    .click();
  await p.waitForTimeout(500);
  let lib = await library();
  assert.equal(lib.entries.length, 2);
  const copy = lib.entries.find((e) => e.id !== original.id);
  await p
    .getByRole("button", { name: "编辑简历 " + copy.title, exact: true })
    .click();
  await p.waitForSelector(".editor-panel");
  assert.equal(await p.locator(".resume-library").count(), 0);
  await p.getByRole("button", { name: "修改简历名称" }).click();
  await p
    .getByRole("textbox", { name: "简历名称", exact: true })
    .fill("AI 产品经理 · 定制");
  await p
    .getByRole("textbox", { name: "简历名称", exact: true })
    .press("Enter");
  const name = p.locator('.basic-info input[aria-label="姓名"]');
  await name.fill("独立副本");
  await name.blur();
  await p.waitForTimeout(500);
  await p.getByRole("button", { name: "返回我的简历" }).click();
  await p.waitForSelector(".home-resume-card");
  lib = await library();
  assert.equal(
    lib.entries.find((e) => e.id === original.id).document.basics.name,
    original.document.basics.name,
  );
  assert.equal(
    lib.entries.find((e) => e.id === copy.id).document.basics.name,
    "独立副本",
  );
  await p.getByRole("button", { name: "个人档案", exact: true }).click();
  await p.waitForSelector(".profile-details");
  assert.equal(
    await p.locator('.basic-info input[aria-label="姓名"]').inputValue(),
    "",
  );
  await p.locator('.basic-info input[aria-label="姓名"]').fill("真实档案姓名");
  await p
    .locator(".profile-toc")
    .getByRole("button", { name: "补充事实", exact: true })
    .click();
  await p
    .getByRole("textbox", { name: "档案补充事实" })
    .fill(
      "我独立完成过一个名为星河笔记的项目原型，使用 Figma 设计了五个页面。",
    );
  await p.reload();
  await p
    .locator(".profile-toc")
    .getByRole("button", { name: "补充事实", exact: true })
    .click();
  assert.ok(
    (
      await p.getByRole("textbox", { name: "档案补充事实" }).inputValue()
    ).includes("星河笔记"),
  );
  await p.screenshot({ path: ".private/portal-profile.png", fullPage: true });
  await p.getByRole("button", { name: "Agent 设置", exact: true }).click();
  await p.getByRole("textbox", { name: "默认目标岗位" }).fill("AI 产品经理");
  await p.getByRole("switch", { name: "参考个人档案" }).click();
  await p.reload();
  assert.equal(
    await p
      .getByRole("switch", { name: "参考个人档案" })
      .getAttribute("aria-checked"),
    "false",
  );
  await p.getByRole("switch", { name: "参考个人档案" }).click();
  await p.getByRole("button", { name: "模型与 API", exact: true }).click();
  await p.getByRole("textbox", { name: "DeepSeek API Key" }).waitFor();
  assert.equal(
    await p.getByRole("textbox", { name: "DeepSeek API Key" }).inputValue(),
    "",
  );
  assert.equal(
    await p.locator(".settings-only .agent-compose").isVisible(),
    false,
  );
  await p.screenshot({ path: ".private/portal-settings.png", fullPage: true });
  await p.getByRole("button", { name: "我的简历", exact: true }).click();
  assert.equal(await p.locator(".home-services").count(), 0);
  assert.equal(await p.locator(".home-agent").count(), 0);
  await p.locator(".resume-thumbnail").first().click();
  await p.waitForSelector(".agent-panel");
  await p.getByRole("button", { name: "返回我的简历" }).click();
  await p.goBack();
  await p.waitForSelector(".editor-panel");
  await p.goBack();
  await p.waitForSelector(".home-resume-card");
  await p.locator('input[type="file"][accept=".pdf,.json"]').setInputFiles({
    name: "主页导入.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(original.document)),
  });
  await p.getByRole("button", { name: "确认导入，开始编辑" }).click();
  await p.waitForSelector(".editor-panel");
  await p.getByRole("button", { name: "返回我的简历" }).click();
  assert.equal(await p.locator(".home-resume-card").count(), 3);
  await p.screenshot({
    path: ".private/portal-home-versions.png",
    fullPage: true,
  });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({ path: ".private/portal-mobile.png", fullPage: true });
  assert.equal(
    await p.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: home/copy/edit/back/profile/persistence/settings/history/mobile",
  );
} finally {
  await b.close();
}
