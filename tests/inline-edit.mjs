import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
try {
  await page.goto("http://localhost:4173/editor");
  const body = page
    .locator(
      '.resume-page [data-section="experience"] [data-inline-field="body"]',
    )
    .first();
  assert.equal(await body.count(), 1, "预览正文应可直接编辑");
  await body.click();
  assert.equal(await body.getAttribute("contenteditable"), "true");
  await page.getByRole("toolbar", { name: "纸面编辑工具" }).waitFor();
  await body.press("End");
  await page.keyboard.type(" INLINE_VERIFY");
  await page.locator(".preview-toolbar").click();
  await page.waitForTimeout(650);
  const edited = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.resume.v1")),
  );
  assert.ok(edited.sections.experience.items[0].body.includes("INLINE_VERIFY"));
  await page.getByTitle("撤销", { exact: true }).click();
  await page.waitForTimeout(500);
  assert.ok(
    !(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("zhijian.resume.v1")),
      )
    ).sections.experience.items[0].body.includes("INLINE_VERIFY"),
  );
  const fresh = page
    .locator(
      '.resume-page [data-section="experience"] [data-inline-field="body"]',
    )
    .first();
  await fresh.click();
  await fresh.press("End");
  await page.keyboard.type(" DRAFT_RECOVER");
  await page.reload();
  await page.waitForSelector(".resume-page");
  assert.ok(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("zhijian.resume.v1")),
      )
    ).sections.experience.items[0].body.includes("DRAFT_RECOVER"),
  );
  const rich = page
    .locator(
      '.resume-page [data-section="experience"] [data-inline-field="body"]',
    )
    .first();
  await rich.click();
  await rich.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await page
    .getByRole("toolbar", { name: "纸面编辑工具" })
    .getByRole("button", { name: "加粗", exact: true })
    .click();
  await page.locator(".preview-toolbar").click();
  await page.waitForTimeout(500);
  assert.match(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("zhijian.resume.v1")),
      )
    ).sections.experience.items[0].body,
    /<(?:b|strong)[ >]/,
  );
  await rich.click();
  await page
    .getByRole("toolbar", { name: "纸面编辑工具" })
    .getByRole("button", { name: "AI生成", exact: true })
    .click();
  assert.ok(await page.locator(".selection-chip").count());
  console.log(
    "PASS: direct typing, floating tools, save, undo, in-focus refresh recovery, bold and AI quote",
  );
} finally {
  await browser.close();
}
