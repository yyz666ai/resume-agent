import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { demoResume } from "../src/model.js";
const d = demoResume();
d.sections.experience.items[0].body =
  "<ol>" +
  Array.from(
    { length: 70 },
    (_, i) =>
      `<li>第${i + 1}项真实项目职责：梳理需求、完成设计并验证交付结果，记录实际工作过程与团队反馈。</li>`,
  ).join("") +
  "</ol>";
const b = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1680, height: 1050 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  await p.addInitScript((doc) => {
    if (!localStorage.getItem("zhijian.library.v1")) {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 400;
      const c = canvas.getContext("2d");
      c.fillStyle = "#b8c5ad";
      c.fillRect(0, 0, 300, 400);
      const data = canvas.toDataURL("image/png");
      doc.photo = {
        source: data,
        dataUrl: data,
        width: 28,
        ratio: "3:4",
        visible: true,
      };
      localStorage.setItem("zhijian.resume.v1", JSON.stringify(doc));
    }
  }, d);
  await p.goto("http://localhost:4173/editor");
  await p.waitForFunction(() => window.__RESUME_READY__);
  await p.waitForTimeout(600);
  const rows = p.locator(
    '.resume-page [data-entry="' + d.sections.experience.items[0].id + '"]',
  );
  assert.ok((await rows.count()) > 1);
  const numbers = await rows
    .locator("ol")
    .evaluateAll((lists) =>
      lists.flatMap((list) =>
        [...list.children].map(
          (li, i) => Number(list.getAttribute("start") || 1) + i,
        ),
      ),
    );
  assert.deepEqual(
    numbers,
    Array.from({ length: 70 }, (_, i) => i + 1),
  );
  const width = await p
    .locator(".resume-page .resume-photo")
    .first()
    .evaluate((el) => el.getBoundingClientRect().width);
  await p.getByRole("button", { name: "排版设置", exact: true }).click();
  const range = p.getByLabel("简历照片宽度", { exact: true });
  await range.focus();
  await range.press("Home");
  for (let i = 0; i < 16; i++) await range.press("ArrowRight");
  await p.waitForTimeout(600);
  const doc = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.resume.v1")),
  );
  assert.equal(doc.photo.width, 36);
  assert.ok(
    (await p
      .locator(".resume-page .resume-photo")
      .first()
      .evaluate((el) => el.getBoundingClientRect().width)) > width,
  );
  const header = await p
    .locator(".resume-page .resume-header")
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        width: s.borderBottomWidth,
        style: s.borderBottomStyle,
        color: s.borderBottomColor,
      };
    });
  assert.equal(header.width, "1px");
  assert.equal(header.style, "solid");
  assert.equal(header.color, "rgb(224, 227, 226)");
  assert.equal(await p.evaluate(() => window.__RESUME_OVERFLOW__), false);
  const exported = await p.request.post("http://localhost:4173/api/export", {
    data: { document: doc },
    timeout: 60000,
  });
  assert.equal(exported.status(), 200);
  await fs.writeFile(".private/numbered-pages.pdf", await exported.body());
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 70 list items retained and numbered continuously across pages; photo size changes in layout; subtle header rule; multi-page PDF export",
  );
} finally {
  await b.close();
}
