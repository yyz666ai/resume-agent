import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { TEMPLATES, templateStyle } from "../src/templates.js";
const photo = process.env.TEST_PHOTO,
  pdf = process.env.TEST_PDF;
if (!photo || !pdf)
  throw Error("请用 TEST_PHOTO 和 TEST_PDF 提供测试照片及包含照片的 PDF");
await fs.mkdir(".private/photos", { recursive: true });
const base = process.env.TEST_URL || "http://localhost:4173";
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
  await p.getByLabel("选择简历照片", { exact: true }).setInputFiles(photo);
  await p.getByRole("dialog", { name: "裁剪简历照片" }).waitFor();
  await p.getByLabel("照片裁剪范围", { exact: true }).fill("80");
  const box = await p.getByLabel("照片裁剪选框", { exact: true }).boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 8, {
    steps: 5,
  });
  await p.mouse.up();
  const handle = await p
    .getByLabel("调整裁剪框大小", { exact: true })
    .boundingBox();
  await p.mouse.move(handle.x + 10, handle.y + 10);
  await p.mouse.down();
  await p.mouse.move(handle.x + 18, handle.y + 12, { steps: 4 });
  await p.mouse.up();
  await p.screenshot({ path: ".private/photos/crop.png" });
  await p.getByRole("button", { name: "确认裁剪并使用", exact: true }).click();
  await p.waitForTimeout(600);
  assert.equal((await read()).photo.ratio, "3:4");
  assert.equal(await p.locator(".resume-page .resume-photo img").count(), 1);
  await p.reload();
  await p.waitForSelector(".resume-page .resume-photo img");
  const stored = await read();
  assert.ok(stored.photo.source.startsWith("data:image/jpeg"));
  await p.getByLabel("简历照片宽度", { exact: true }).fill("34");
  await p.waitForTimeout(500);
  assert.equal((await read()).photo.width, 34);
  await p.getByLabel("编辑简历照片", { exact: true }).click();
  await p.getByLabel("照片裁剪比例", { exact: true }).selectOption("1:1");
  await p.getByRole("button", { name: "确认裁剪并使用", exact: true }).click();
  await p.waitForTimeout(500);
  assert.equal((await read()).photo.ratio, "1:1");
  await p.getByLabel("显示照片", { exact: true }).uncheck();
  assert.equal(await p.locator(".resume-page .resume-photo img").count(), 0);
  await p.getByTitle("撤销", { exact: true }).click();
  await p.locator(".resume-page .resume-photo img").waitFor();
  console.log(
    "PASS: supplied photo upload, draggable/resizable crop, ratio, size, hide/undo and refresh recovery",
  );
  const own = await read();
  let response = await p.request.post(base + "/api/export", {
    data: { document: own },
    timeout: 60000,
  });
  assert.equal(response.status(), 200);
  await fs.writeFile(
    ".private/photos/uploaded-photo.pdf",
    await response.body(),
  );
  await p.locator('input[type=file][accept=".pdf,.json"]').setInputFiles(pdf);
  await p.getByRole("button", { name: "确认导入，开始编辑" }).waitFor();
  assert.ok((await p.locator(".import-photo-candidates img").count()) > 0);
  await p
    .locator(".import-selected-photo")
    .getByRole("button", { name: "裁剪", exact: true })
    .click();
  await p.getByRole("dialog", { name: "裁剪简历照片" }).waitFor();
  await p.getByRole("button", { name: "确认裁剪并使用", exact: true }).click();
  await p.getByRole("button", { name: "确认导入，开始编辑" }).click();
  await p.waitForTimeout(600);
  const imported = await read();
  assert.ok(imported.photo);
  assert.ok(imported.photoCandidates.length);
  await p.locator(".resume-page .resume-photo img").waitFor();
  await p.screenshot({ path: ".private/photos/imported.png" });
  for (const template of TEMPLATES) {
    const document = structuredClone(imported);
    Object.assign(document.style, templateStyle(template.id));
    response = await p.request.post(base + "/api/export", {
      data: { document },
      timeout: 60000,
    });
    assert.equal(
      response.status(),
      200,
      await response.text().then((s) => s.slice(0, 180)),
    );
    await fs.writeFile(
      ".private/photos/" + template.id + ".pdf",
      await response.body(),
    );
    console.log("PHOTO PDF", template.id);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: source PDF photo extraction, candidate recrop and nine actual PDF exports, no JS errors",
  );
} finally {
  await b.close();
}
