import { chromium } from "playwright";
import assert from "node:assert/strict";
const b = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1680, height: 1050 } });
try {
  await p.goto("http://localhost:4173/editor");
  await p.getByRole("button", { name: "简历模板", exact: true }).click();
  await p.getByRole("button", { name: /现代侧栏/ }).click();
  await p.getByRole("button", { name: "内容编辑", exact: true }).click();
  const name = p.locator(
    '.resume-page .resume-side [data-inline-field="name"]',
  );
  await name.click();
  await p.waitForTimeout(200);
  assert.equal(
    await name.evaluate((e) => document.activeElement === e),
    true,
    "侧栏点击后必须保留同一个编辑节点",
  );
  await name.fill("侧栏验证");
  await p.locator(".preview-toolbar").click();
  await p.waitForTimeout(500);
  assert.equal(
    await p.getByRole("toolbar", { name: "纸面编辑工具" }).count(),
    0,
  );
  assert.equal(await name.innerText(), "侧栏验证");
  console.log("PASS: sidebar edit focus and finish button");
} finally {
  await b.close();
}
