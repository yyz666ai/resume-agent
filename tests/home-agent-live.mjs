// 需要显式开启。使用用户指定 PDF 调用真实 DeepSeek；所有测试结果仅保存于忽略目录。
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
if (process.env.LIVE_DEEPSEEK !== "1" || !process.env.TEST_PDF)
  throw Error("需要 LIVE_DEEPSEEK=1 和 TEST_PDF");
const b = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1680, height: 1050 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  await p.goto("http://localhost:4173/");
  await p.waitForSelector(".home-agent");
  await p.waitForTimeout(500);
  const original = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.library.v1")),
  );
  await p.getByLabel("上传简历Agent PDF").setInputFiles(process.env.TEST_PDF);
  await p
    .getByLabel("给简历Agent发送要求")
    .fill(
      "请只精简个人优势为一段，保留已有真实事实，不编造数据。其他模块、姓名、职位、日期、照片和排版均不修改。请直接完成修改，并根据姓名和简历方向自动起一个简短名称。",
    );
  const wait = p.waitForResponse((r) => r.url().endsWith("/api/agent"), {
    timeout: 180000,
  });
  await p.getByLabel("给简历Agent发送要求").press("Enter");
  const response = await wait;
  const data = await response.json();
  assert.equal(response.status(), 200, data.error);
  const request = response.request().postDataJSON();
  assert.equal(request.workflow, "home");
  assert.ok(data.proposal.resumeTitle?.trim());
  assert.ok(data.proposal.changes.some((c) => c.section === "summary"));
  await p.locator(".home-agent-result").waitFor();
  const lib = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.library.v1")),
  );
  assert.equal(lib.entries.length, original.entries.length + 1);
  assert.deepEqual(
    lib.entries.find((e) => e.id === original.activeId),
    original.entries[0],
  );
  const result = lib.entries.find((e) => e.id === lib.activeId);
  assert.equal(result.title, data.proposal.resumeTitle.trim().slice(0, 80));
  for (const key of request.document.order)
    if (key !== "summary")
      assert.deepEqual(
        result.document.sections[key],
        request.document.sections[key],
      );
  assert.deepEqual(result.document.photo, request.document.photo);
  assert.equal(result.document.style.template, "classic");
  await p.getByRole("button", { name: "进入编辑器", exact: true }).click();
  await p.waitForSelector(".editor-panel");
  assert.equal(
    (
      await p.evaluate(() =>
        JSON.parse(localStorage.getItem("zhijian.library.v1")),
      )
    ).activeId,
    result.id,
  );
  const pdf = await p.request.post("http://localhost:4173/api/export", {
    data: { document: result.document },
    timeout: 60000,
  });
  assert.equal(pdf.status(), 200);
  await fs.writeFile(".private/home-agent-live.pdf", await pdf.body());
  const status = await (
    await p.request.get("http://localhost:4173/api/harness/status")
  ).json();
  assert.equal(status.apiVerified, true);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: original PDF -> genuine DeepSeek -> auto naming + applied changes -> editor -> PDF export; other sections and photo unchanged",
  );
} finally {
  await b.close();
}
