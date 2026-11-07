import { chromium } from "playwright";
import assert from "node:assert/strict";
const b = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1512, height: 982 } });
let requests = [];
const quote = "我在星河科技负责产品原型，设计了五个页面";
await p.route("**/api/harness/status", (r) =>
  r.fulfill({ json: { apiVerified: true, configuration: { hasKey: true } } }),
);
await p.route("**/api/agent", (r) => {
  const body = r.request().postDataJSON();
  requests.push(body);
  return r.fulfill({
    json: {
      proposal:
        requests.length === 1
          ? {
              message: "已记录你的陈述，是否保存到档案？",
              changes: [],
              profileSuggestion: { notes: quote, quote },
              resumeTitle: "产品简历",
            }
          : {
              message: "已整理项目经历",
              changes: [
                {
                  section: "projects",
                  items: [
                    {
                      title: "产品原型",
                      subtitle: "",
                      date: "",
                      body: "<p>设计了五个产品原型页面。</p>",
                    },
                  ],
                },
              ],
              resumeTitle: "产品原型 · 岗位简历",
            },
    },
  });
});
try {
  await p.goto("http://localhost:4173/");
  await p.locator(".home-agent").waitFor();
  await p.waitForTimeout(500);
  const initial = await p.evaluate(
    () => JSON.parse(localStorage.getItem("zhijian.library.v1")).entries.length,
  );
  await p
    .getByLabel("给简历Agent发送要求")
    .fill("不要参考个人档案。我补充的真实经历是：" + quote + "。");
  await p.getByLabel("给简历Agent发送要求").press("Enter");
  await p.locator(".profile-suggestion").waitFor();
  assert.equal(requests[0].reference.profile, undefined);
  assert.equal(
    await p.getByLabel("参考个人档案", { exact: true }).isChecked(),
    false,
  );
  assert.equal(
    await p.evaluate(() => localStorage.getItem("ai-resume.profile.v1")),
    null,
  );
  assert.equal(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zhijian.library.v1")).entries.length,
    ),
    initial,
  );
  await p.getByRole("button", { name: "保存到个人档案", exact: true }).click();
  assert.match(
    await p.evaluate(
      () => JSON.parse(localStorage.getItem("ai-resume.profile.v1")).notes,
    ),
    /五个页面/,
  );
  await p
    .getByLabel("给简历Agent发送要求")
    .fill("请重新参考档案，将刚才的经历放到项目经历里。");
  await p.getByLabel("给简历Agent发送要求").press("Enter");
  await p.locator(".home-agent-result").waitFor();
  assert.ok(requests[1].reference.profile.notes.includes(quote));
  await p.getByRole("button", { name: "我的简历", exact: true }).click();
  await p.locator(".home-resume-card").first().waitFor();
  assert.equal(await p.locator(".home-resume-card").count(), initial + 1);
  assert.match(
    await p.locator(".home-resume-card").first().innerText(),
    /产品原型/,
  );
  console.log(
    "PASS: conversational profile opt-out removes payload; quoted facts require confirmation; profile restored on request; generated resume saved in separate library",
  );
} finally {
  await b.close();
}
