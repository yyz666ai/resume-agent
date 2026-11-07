import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { demoResume } from "../src/model.js";
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
await fs.mkdir(".private", { recursive: true });
const base = "http://localhost:4173";
const pdf = process.env.TEST_PDF || ".private/home-agent-source.pdf";
try {
  if (!process.env.TEST_PDF) {
    const maker = await browser.newPage();
    await maker.setContent(
      '<html><body style="font-family:Arial"><h1>Alex Chen</h1><p>alex@example.com</p><h2>项目经历</h2><h3>星河笔记</h3><p>设计五个页面的产品原型，使用 Figma。</p><h2>专业技能</h2><p>Figma / Python</p></body></html>',
    );
    await maker.pdf({ path: pdf, format: "A4" });
    await maker.close();
  }
  const p = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  let requests = [],
    imports = 0,
    available = true;
  await p.route("**/api/import?mode=ai", async (route) => {
    imports++;
    if (!available)
      return route.fulfill({ status: 400, json: { error: "请配置 API 后重新导入" } });
    const response = await p.request.post(base + "/api/import", {
      multipart: { file: { name: "test.pdf", mimeType: "application/pdf", buffer: await fs.readFile(pdf) } },
    });
    return route.fulfill({ response });
  });
  await p.route("**/api/harness/status", (route) =>
    route.fulfill({
      json: {
        apiVerified: available,
        configuration: { hasKey: available },
        capabilities: { images: true },
      },
    }),
  );
  await p.route("**/api/agent", async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    if (requests.length === 1) await new Promise((resolve) => setTimeout(resolve, 350));
    return route.fulfill({
      json: {
        proposal:
          requests.length === 2
            ? {
                message: "已调整行距",
                changes: [],
                style: { lineHeight: 1.8 },
                resumeTitle: "Alex Chen · 产品经理",
              }
            : {
                message: "已按现有事实整理个人优势",
                resumeTitle: "Alex Chen · 产品经理",
                changes: [
                  {
                    section: "summary",
                    items: [
                      {
                        title: "",
                        subtitle: "",
                        date: "",
                        body: "<p>熟悉 Figma 产品原型设计。</p>",
                      },
                    ],
                  },
                ],
              },
      },
    });
  });
  await p.goto(base);
  await p.waitForSelector(".home-agent");
  await p.waitForTimeout(500);
  await p.screenshot({ path: ".private/home-agent-ready.png", fullPage: true });
  const composer = p.locator(".home-agent-input");
  const inputBottom = async () => {
    const { y, height } = await composer.boundingBox();
    return Math.round(y + height);
  };
  const bottom = await inputBottom();
  assert.ok(bottom > 990 && bottom < 1050, "composer is near viewport bottom");
  const initial = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.library.v1")),
  );
  assert.equal(await p.locator(".home-services").count(), 0);
  await p.getByLabel("上传简历Agent PDF").setInputFiles(pdf);
  await p
    .getByLabel("给简历Agent发送要求")
    .fill("面向产品经理岗位精简个人优势，保持事实。");
  const beforeSend = await composer.boundingBox();
  await p.getByLabel("给简历Agent发送要求").press("Enter");
  await p.locator(".home-agent-progress").waitFor();
  assert.deepEqual(await composer.boundingBox(), beforeSend);
  await p.locator(".home-agent-result").waitFor({ timeout: 60000 });
  assert.deepEqual(await composer.boundingBox(), beforeSend);
  assert.equal(await inputBottom(), bottom);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].workflow, "home");
  assert.equal(await p.locator(".editor-panel").count(), 0);
  assert.match(
    await p.locator(".home-agent-result").innerText(),
    /Alex Chen.*产品经理/,
  );
  let lib = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.library.v1")),
  );
  assert.equal(lib.entries.length, 2);
  assert.deepEqual(
    lib.entries.find((e) => e.id === initial.activeId),
    initial.entries[0],
  );
  const generated = lib.entries.find((e) => e.id !== initial.activeId);
  assert.equal(generated.document.style.template, "classic");
  assert.match(JSON.stringify(generated.document.sections.summary), /Figma/);
  await p.getByLabel("给简历Agent发送要求").fill("把行距改为1.8");
  await p.getByLabel("给简历Agent发送要求").press("Enter");
  await p.getByText("已调整行距", { exact: true }).waitFor();
  lib = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.library.v1")),
  );
  assert.equal(lib.entries.length, 2);
  assert.equal(
    lib.entries.find((e) => e.id === generated.id).document.style.lineHeight,
    1.8,
  );
  assert.equal(imports, 1);
  assert.equal(requests[1].conversation.length, 2);
  await p.screenshot({ path: ".private/home-agent-flow.png", fullPage: true });
  await p.getByRole("button", { name: "进入编辑器", exact: true }).click();
  await p.waitForSelector(".editor-panel");
  await p.getByRole("button", { name: "返回我的简历" }).click();
  await p.waitForSelector(".home-resume-card");
  assert.equal(await p.locator(".home-resume-card").count(), 2);
  await p.getByRole("button", { name: "简历Agent", exact: true }).click();
  // 未配置 API：不保存未经模型归类的结果，配置后可重试。
  available = false;
  await p.getByLabel("上传简历Agent PDF").setInputFiles(pdf);
  await p.getByLabel("给简历Agent发送要求").fill("润色项目描述");
  await p.getByLabel("给简历Agent发送要求").press("Enter");
  await p.getByRole("alert").waitFor({ timeout: 60000 });
  assert.match(await p.getByRole("alert").innerText(), /配置 API/);
  assert.equal(
    await p.getByRole("button", { name: "进入编辑器", exact: true }).count(),
    0,
  );
  const count = await p.evaluate(
    () => JSON.parse(localStorage.getItem("zhijian.library.v1")).entries.length,
  );
  available = true;
  await p.getByLabel("给简历Agent发送要求").press("Enter");
  await p.getByText("已按现有事实整理个人优势", { exact: true }).waitFor();
  assert.equal(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zhijian.library.v1")).entries.length,
    ),
    count + 1,
  );
  assert.equal(imports, 3);
  await p.getByRole("button", { name: "开始新的简历任务" }).click();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({
    path: ".private/home-agent-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await p.getByRole("button", { name: "模型设置", exact: true }).click();
  await p.getByLabel("DeepSeek API Key", { exact: true }).waitFor();
  assert.ok(p.url().includes("/settings?tab=api"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real PDF parse -> automatic copy/name/layout -> apply -> follow-up -> editor; missing API recovery; originals unchanged; mobile",
  );
} finally {
  await browser.close();
}
