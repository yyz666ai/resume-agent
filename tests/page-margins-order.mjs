import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { demoResume } from "../src/model.js";
import { TEMPLATES, templateStyle } from "../src/templates.js";
let source = demoResume();
source.sections.experience.items[0].body =
  "<ol>" +
  Array.from(
    { length: 65 },
    (_, i) =>
      `<li>分页验证第${i + 1}项：整理产品需求与反馈，设计关键流程并跟踪实际交付结果，协同团队完成项目验证。</li>`,
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
await fs.mkdir(".private", { recursive: true });
try {
  if (process.env.TEST_PDF) {
    const imported = await p.request.post("http://localhost:4173/api/import", {
      multipart: {
        file: {
          name: "test.pdf",
          mimeType: "application/pdf",
          buffer: await fs.readFile(process.env.TEST_PDF),
        },
      },
    });
    assert.equal(imported.status(), 200);
    source = (await imported.json()).document;
    assert.deepEqual(source.order.slice(0, 3), [
      "education",
      "experience",
      "projects",
    ]);
  }
  const exportedPages = {};
  for (const template of TEMPLATES) {
    const doc = structuredClone(source);
    Object.assign(doc.style, templateStyle(template.id));
    await p.goto("http://localhost:4173/editor");
    await p.evaluate((d) => {
      localStorage.removeItem("zhijian.library.v1");
      localStorage.setItem("zhijian.resume.v1", JSON.stringify(d));
    }, doc);
    await p.reload();
    await p.waitForFunction(() => window.__RESUME_READY__);
    await p.waitForTimeout(300);
    const order = await p
      .locator(".resume-page .resume-main [data-section]")
      .evaluateAll((nodes) => [
        ...new Set(
          nodes
            .map((el) => el.dataset.section)
            .filter((key) => key !== "basics"),
        ),
      ]);
    assert.deepEqual(
      order.slice(0, 3),
      ["education", "experience", "projects"],
      template.id + " section order",
    );
    const inspect = () =>
      p.evaluate(() =>
        [...document.querySelectorAll(".resume-page")].map((page) => {
          const r = page.getBoundingClientRect(),
            scale = r.width / page.offsetWidth,
            s = getComputedStyle(page),
            main = page.querySelector(".resume-main"),
            last = main.lastElementChild;
          const footer = page.querySelector(".resume-page-footer");
          return {
            footerGap: footer && last
              ? (footer.getBoundingClientRect().top - last.getBoundingClientRect().bottom) / scale
              : null,
            topMargin: (main.getBoundingClientRect().top - r.top) / scale,
            bottom: last
              ? (r.bottom - last.getBoundingClientRect().bottom) / scale
              : 9999,
            required: 8.5 * (96 / 25.4),
            requiredTop: parseFloat(s.paddingTop),
            footer: footer?.textContent.trim() || "",
          };
        }),
      );
    let geometry = await inspect();
    assert.ok(geometry.length > 1);
    for (const item of geometry) {
      assert.ok(
        item.topMargin >= item.requiredTop - 1,
        template.id + " missing top margin",
      );
      assert.ok(
        item.bottom >= item.required - 2,
        template.id +
          " content overlaps bottom margin: " +
          JSON.stringify(item),
      );
      assert.ok(item.footerGap === null || item.footerGap >= 6, template.id + " page number overlaps text");
      assert.ok(!item.footer.includes(source.basics.name));
      assert.ok(!item.footer.includes("个人简历"));
    }
    const count = await p.locator(".resume-page").count();
    await p.getByLabel("缩小", { exact: true }).click();
    await p.getByLabel("缩小", { exact: true }).click();
    await p.waitForTimeout(100);
    assert.equal(
      await p.locator(".resume-page").count(),
      count,
      template.id + " changed pages on zoom",
    );
    geometry = await inspect();
    for (const item of geometry) assert.ok(item.bottom >= item.required - 2);
    const stored = await p.evaluate(() =>
      JSON.parse(localStorage.getItem("zhijian.resume.v1")),
    );
    const print = await b.newPage();
    await print.addInitScript(
      (d) => sessionStorage.setItem("resume-print", JSON.stringify(d)),
      stored,
    );
    await print.goto("http://localhost:4173/print");
    await print.waitForFunction(() => window.__RESUME_READY__);
    await print.waitForTimeout(100);
    assert.equal(
      await print.locator(".resume-page").count(),
      count,
      template.id + " preview and PDF page counts differ",
    );
    await print.close();
    if (process.env.EXPORT_PDF === "1") {
      const pdf = await p.request.post("http://localhost:4173/api/export", {
        data: { document: stored },
        timeout: 60000,
      });
      assert.equal(pdf.status(), 200);
      await fs.writeFile(
        ".private/page-check-" + template.id + ".pdf",
        await pdf.body(),
      );
      exportedPages[template.id] = count;
    }

    console.log("PASS", template.id, "page margins, order, footer and zoom");
  }
  await fs.writeFile(
    ".private/page-check-counts.json",
    JSON.stringify(exportedPages),
  );
  assert.deepEqual(errors, []);
} finally {
  await b.close();
}
