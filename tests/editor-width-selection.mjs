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
const visible = () => p.locator(".resume-page .basic-hide-on-paper:visible");
const field = (key) =>
  p.locator('.resume-page [data-inline-field="' + key + '"]').first();
try {
  await p.goto("http://localhost:4173/editor");
  await p.waitForSelector(".resume-page");
  await p.waitForTimeout(500);
  await p.locator(".resume-page .resume-header").hover();
  assert.equal(await visible().count(), 0);
  await field("phone").hover();
  assert.equal(await visible().count(), 0);
  await field("phone").click();
  assert.equal(await visible().count(), 1);
  assert.equal(await visible().getAttribute("aria-label"), "从预览隐藏phone");
  await field("email").hover();
  assert.equal(await visible().count(), 1);
  assert.equal(await visible().getAttribute("aria-label"), "从预览隐藏phone");
  await field("email").click();
  assert.equal(await visible().count(), 1);
  assert.equal(await visible().getAttribute("aria-label"), "从预览隐藏email");
  await field("email").fill("changed@example.com");
  await visible().click();
  await p.waitForTimeout(500);
  assert.equal(await field("email").count(), 0);
  const saved = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.resume.v1")),
  );
  assert.equal(saved.basics.email, "changed@example.com");
  assert.equal(saved.basicsVisibility.email, false);
  assert.equal(await visible().count(), 0);
  await p
    .locator(".hidden-basic-fields")
    .getByRole("button", { name: "邮箱", exact: true })
    .click();
  await field("name").click();
  assert.equal(await visible().count(), 1);
  await p.locator(".preview-toolbar").click();
  assert.equal(await visible().count(), 0);
  const separator = p.getByRole("separator", {
    name: "调整编辑栏宽度",
    exact: true,
  });
  const width = await p
    .locator(".editor-panel")
    .evaluate((el) => el.getBoundingClientRect().width);
  const box = await separator.boundingBox();
  await p.mouse.move(box.x + 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + 82, box.y + box.height / 2, { steps: 10 });
  await p.mouse.up();
  const resized = await p
    .locator(".editor-panel")
    .evaluate((el) => el.getBoundingClientRect().width);
  assert.ok(resized >= width + 75);
  assert.equal(
    await p.evaluate(() => document.body.classList.contains("resizing-panels")),
    false,
  );
  await p.reload();
  await p.waitForSelector(".resume-page");
  assert.equal(
    await p
      .locator(".editor-panel")
      .evaluate((el) => el.getBoundingClientRect().width),
    resized,
  );
  await separator.focus();
  await separator.press("ArrowLeft");
  assert.equal(
    await p
      .locator(".editor-panel")
      .evaluate((el) => el.getBoundingClientRect().width),
    resized - 20,
  );
  const right = p.getByRole("separator", { name: "调整助手宽度", exact: true }),
    rightBox = await right.boundingBox(),
    rightWidth = await p
      .locator(".agent-panel")
      .evaluate((el) => el.getBoundingClientRect().width);
  await p.mouse.move(rightBox.x + 2, rightBox.y + rightBox.height / 2);
  await p.mouse.down();
  await p.mouse.move(rightBox.x - 48, rightBox.y + rightBox.height / 2, {
    steps: 10,
  });
  await p.mouse.up();
  assert.ok(
    (await p
      .locator(".agent-panel")
      .evaluate((el) => el.getBoundingClientRect().width)) >
      rightWidth + 40,
  );
  await p.getByTitle("收起助手", { exact: true }).click();
  assert.equal(await p.locator(".agent-panel").count(), 0);
  await separator.focus();
  await separator.press("ArrowRight");
  await p.getByTitle("展开助手", { exact: true }).click();
  await field("phone").click();
  assert.equal(await visible().count(), 1);
  await fs.mkdir(".private", { recursive: true });
  await p.screenshot({
    path: ".private/selected-contact-resizable-editor.png",
    fullPage: true,
  });
  await p.setViewportSize({ width: 1100, height: 950 });
  await p.reload();
  await p.waitForSelector(".resume-page");
  assert.ok(
    (await p
      .locator(".preview-panel")
      .evaluate((el) => el.getBoundingClientRect().width)) >= 300,
  );
  await p.getByTitle("收起助手", { exact: true }).click();
  await separator.focus();
  for (let i = 0; i < 20; i++) await separator.press("ArrowRight");
  await p.getByTitle("展开助手", { exact: true }).click();
  await p.waitForTimeout(100);
  assert.ok(
    (await p
      .locator(".preview-panel")
      .evaluate((el) => el.getBoundingClientRect().width)) >= 300,
  );
  assert.ok(
    await p
      .locator(".workspace")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: hover shows no close controls; click selects exactly one; hide saves edited value; blank deselects; both panels drag; left width persists, keyboard and collapsed-agent layout work",
  );
} finally {
  await b.close();
}
