// 显式启用后调用已配置的真实 DeepSeek API，仅使用虚构的测试事实。
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { emptyProfile, PROFILE_KEY } from "../src/profile.js";
if (process.env.LIVE_DEEPSEEK !== "1")
  throw Error("请显式设置 LIVE_DEEPSEEK=1");
const b = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1680, height: 1050 } });
const profile = emptyProfile();
profile.notes =
  "测试用户真实经历：独立完成星河笔记产品原型，使用 Figma 设计五个页面；没有上线，没有用户数和业务收入数据。";
try {
  await p.addInitScript(
    ({ key, profile }) => {
      localStorage.setItem(key, JSON.stringify(profile));
    },
    { key: PROFILE_KEY, profile },
  );
  await p.goto("http://localhost:4173/settings");
  await p.getByRole("button", { name: "模型与 API", exact: true }).click();
  const wasVerified = (
    await (
      await p.request.get("http://localhost:4173/api/harness/status")
    ).json()
  ).apiVerified;
  if (!wasVerified) {
    const connection = p.waitForResponse(
      (r) => r.url().endsWith("/api/harness/connect"),
      { timeout: 145000 },
    );
    await p.getByRole("button", { name: "测试 API 联通" }).click();
    const connected = await connection;
    assert.equal(connected.status(), 200);
    const reply = await connected.json();
    assert.ok(reply.reply.length > 0);
  }
  await p.getByRole("button", { name: "我的简历", exact: true }).click();
  await p.getByRole("button", { name: /^编辑简历 / }).click();
  await p.getByLabel("助手修改范围").selectOption("summary");
  await p
    .getByLabel("给简历助手发送消息")
    .fill(
      "请仅重写个人优势，删除这一模块原来的内容，仅根据档案补充事实概括星河笔记的产品设计经历。不保留旧个人优势的其他经历。不增加任何未提供的数字。",
    );
  await p.waitForFunction(() => localStorage.getItem("zhijian.resume.v1"));
  const before = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.resume.v1")),
  );
  const response = p.waitForResponse((r) => r.url().endsWith("/api/agent"), {
    timeout: 145000,
  });
  await p.getByRole("button", { name: "发送消息", exact: true }).click();
  const result = await response;
  const data = await result.json();
  assert.equal(result.status(), 200, data.error);
  const request = result.request().postDataJSON();
  assert.equal(request.reference.profile.notes, profile.notes);
  assert.ok(
    JSON.stringify(data.proposal).includes("星河笔记"),
    JSON.stringify(data.proposal),
  );
  assert.ok(data.proposal.changes.every((c) => c.section === "summary"));
  await p.getByRole("button", { name: "撤回本次修改", exact: true }).waitFor();
  await p.waitForTimeout(650);
  const after = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("zhijian.resume.v1")),
  );
  assert.ok(JSON.stringify(after.sections.summary).includes("星河笔记"));
  assert.deepEqual(after.sections.experience, before.sections.experience);
  assert.equal(
    await p.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).notes,
      PROFILE_KEY,
    ),
    profile.notes,
  );
  await p.screenshot({
    path: ".private/profile-agent-live.png",
    fullPage: true,
  });
  console.log(
    "PASS: real API connectivity, profile sent, grounded summary applied, other sections and archive unchanged",
  );
} finally {
  await b.close();
}
