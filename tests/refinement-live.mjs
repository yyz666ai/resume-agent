// 显式启用真实 API。仅使用虚构测试经历，密钥由既有服务端配置提供。
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { demoResume } from "../src/model.js";
if (process.env.LIVE_DEEPSEEK !== "1") throw Error("需要 LIVE_DEEPSEEK=1");
const d = demoResume();
d.sections.experience.items[0].body =
  "<ol><li>我主要做产品需求，整理业务方说的事情，写成需求文档。</li><li>我也负责整理用户反馈，然后跟设计和开发一起改进产品体验。</li><li>我会画原型，然后和大家一起检查关键流程是不是符合需求。</li></ol>";
const b = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1680, height: 1050 } });
await p.addInitScript((doc) => {
  if (!localStorage.getItem("zhijian.library.v1"))
    localStorage.setItem("zhijian.resume.v1", JSON.stringify(doc));
}, d);
try {
  await p.goto("http://localhost:4173/editor");
  await p.waitForSelector(".resume-page");
  await p.waitForTimeout(500);
  const before = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.resume.v1")),
  );
  const body = p
    .locator(
      '.resume-page [data-section="experience"] [data-inline-field="body"]',
    )
    .first();
  await body.click();
  const response = p.waitForResponse((r) => r.url().endsWith("/api/agent"), {
    timeout: 180000,
  });
  await p
    .getByRole("toolbar", { name: "纸面编辑工具" })
    .getByRole("button", { name: "AI润色", exact: true })
    .click();
  const result = await response;
  const data = await result.json();
  assert.equal(result.status(), 200, data.error);
  await p.getByRole("button", { name: "撤回本次修改", exact: true }).waitFor();
  await p.waitForTimeout(650);
  const after = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.resume.v1")),
  );
  assert.notEqual(
    after.sections.experience.items[0].body,
    before.sections.experience.items[0].body,
  );
  assert.deepEqual(
    after.sections.experience.items[1],
    before.sections.experience.items[1],
  );
  assert.deepEqual(after.sections.projects, before.sections.projects);
  assert.equal(
    await p.getByRole("button", { name: "完成", exact: true }).count(),
    0,
  );
  await p.goto("http://localhost:4173/");
  await p.locator(".home-agent").waitFor();
  const quote = "我在星河科技设计过五个 Figma 原型页面";
  await p
    .getByLabel("给简历Agent发送要求")
    .fill(
      "不要参考个人档案，也暂时不要生成或修改简历。我的真实经历是：" +
        quote +
        "。请仅提议把这句话补充到个人档案里，等待我点击确认。",
    );
  const wait = p.waitForResponse((r) => r.url().endsWith("/api/agent"), {
    timeout: 180000,
  });
  await p.getByLabel("给简历Agent发送要求").press("Enter");
  const r = await wait;
  const output = await r.json();
  assert.equal(r.status(), 200, output.error);
  assert.equal(r.request().postDataJSON().reference.profile, undefined);
  assert.ok(output.proposal.profileSuggestion, JSON.stringify(output.proposal));
  await p.locator(".profile-suggestion").waitFor();
  assert.equal(
    await p.evaluate(() => localStorage.getItem("ai-resume.profile.v1")),
    null,
  );
  await p.getByRole("button", { name: "保存到个人档案", exact: true }).click();
  assert.ok(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("ai-resume.profile.v1")).notes.length >
        0,
    ),
  );
  console.log(
    "PASS: genuine DeepSeek one-click targeted polish auto-applies; other entries unchanged; natural profile opt-out; genuine quoted archive suggestion requires confirmation",
  );
} finally {
  await b.close();
}
