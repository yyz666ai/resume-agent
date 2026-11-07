import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { demoResume } from "../src/model.js";
import { TEMPLATES, templateStyle } from "../src/templates.js";
await fs.mkdir(".private/templates", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  await p.goto("http://localhost:4173/editor");
  await p.getByRole("button", { name: "简历模板", exact: true }).click();
  await p.waitForSelector(".real-template-thumb .resume-page");
  assert.equal(await p.locator(".template-gallery .template-card").count(), TEMPLATES.length);
  await p.screenshot({ path: ".private/templates/gallery.png" });
  const sample = process.env.TEST_PDF;
  let original = demoResume();
  if (sample) {
    const imported = await p.request.post("http://localhost:4173/api/import", {
      multipart: {
        file: {
          name: "test.pdf",
          mimeType: "application/pdf",
          buffer: await fs.readFile(sample),
        },
      },
    });
    assert.equal(imported.status(), 200);
    original = (await imported.json()).document;
  }
  for (const t of TEMPLATES) {
    const d = structuredClone(original);
    Object.assign(d.style, templateStyle(t.id));
    const r = await p.request.post("http://localhost:4173/api/export", {
      data: { document: d },
      timeout: 60000,
    });
    assert.equal(r.status(), 200, await r.text().then((s) => s.slice(0, 150)));
    await fs.writeFile(".private/templates/" + t.id + ".pdf", await r.body());
    console.log("EXPORTED", t.id);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: actual template thumbnails and PDF exports, no JavaScript errors",
  );
} finally {
  await browser.close();
}
