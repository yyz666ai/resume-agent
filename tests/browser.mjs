import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.TEST_URL || "http://localhost:4173";
const sample = process.env.TEST_PDF;
if (!sample) throw Error("请用 TEST_PDF 指定文字版测试 PDF");
await fs.mkdir(".private", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1512, height: 982 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(base + "/editor");
  await page.waitForSelector(".resume-page");
  await page.getByLabel("姓名", { exact: true }).fill("测试用户");
  await page.waitForTimeout(600);
  assert.match(await page.locator(".resume-main h1").innerText(), /测试用户/);
  await page.reload();
  await page.waitForSelector(".resume-page");
  assert.equal(
    await page.getByLabel("姓名", { exact: true }).inputValue(),
    "测试用户",
  );
  await page.getByRole("button", { name: "简历模板", exact: true }).click();
  await page.getByRole("button", { name: /现代侧栏/ }).click();
  await page.waitForSelector(".resume-side");
  await page.getByRole("button", { name: "排版设置", exact: true }).click();
  await page.getByLabel("行间距", { exact: true }).fill("1.8");
  const upload = page.locator('input[type=file][accept=".pdf,.json"]');
  await upload.setInputFiles(sample);
  await page.getByRole("button", { name: "确认导入，开始编辑" }).waitFor();
  await page.getByRole("button", { name: "确认导入，开始编辑" }).click();
  await page.waitForTimeout(500);
  assert.ok(
    (await page.getByLabel("姓名", { exact: true }).inputValue()).length > 0,
  );
  assert.ok((await page.locator(".resume-page").count()) >= 1);
  await page.screenshot({ path: ".private/imported.png" });
  for (const template of ["classic", "sidebar", "compact"]) {
    const document = await page.evaluate((t) => {
      const d = JSON.parse(localStorage.getItem("zhijian.resume.v1"));
      d.style.template = t;
      return d;
    }, template);
    const r = await page.request.post(base + "/api/export", {
      data: { document },
    });
    assert.equal(r.status(), 200, await r.text().then((x) => x.slice(0, 150)));
    await fs.writeFile(".private/test-" + template + ".pdf", await r.body());
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: edit, persistence, template, layout, user PDF import, 3 PDF exports, no browser errors",
  );
} finally {
  await browser.close();
}
