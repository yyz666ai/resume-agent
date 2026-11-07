// 本测试使用假的 Messages 服务，验证真实 Harness SDK 调用链，不代表 DeepSeek 在线服务验收。
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import { demoResume } from "../src/model.js";
const work = path.resolve(".private/harness-integration");
await mkdir(work, { recursive: true });
let calls = 0;
const mock = http.createServer(async (req, res) => {
  let input = "";
  for await (const chunk of req) input += chunk;
  if (req.url === "/models") {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({ data: [{ id: "deepseek-flash", object: "model" }] }),
    );
    return;
  }
  if (!req.url.endsWith("/messages")) {
    res.writeHead(404);
    res.end();
    return;
  }
  calls++;
  const text = input.includes("RESUME_API_OK")
    ? "RESUME_API_OK 你好，简历助手已准备好。"
    : JSON.stringify({
        message: "已将个人优势整理为简洁表达。",
        changes: [
          {
            section: "summary",
            items: [
              {
                title: "",
                subtitle: "",
                date: "",
                body: "<p>具备完整的产品规划、用户研究与跨团队协作经验。</p>",
              },
            ],
          },
        ],
      });
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
  const event = (type, data) =>
    res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  event("message_start", {
    message: {
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "deepseek-flash",
      content: [],
      stop_reason: null,
      usage: { input_tokens: 10, output_tokens: 0 },
    },
  });
  event("content_block_start", {
    index: 0,
    content_block: { type: "text", text: "" },
  });
  event("content_block_delta", {
    index: 0,
    delta: { type: "text_delta", text },
  });
  event("content_block_stop", { index: 0 });
  event("message_delta", {
    delta: { stop_reason: "end_turn", stop_sequence: null },
    usage: { output_tokens: 30 },
  });
  event("message_stop", {});
  res.end();
});
await new Promise((r) => mock.listen(0, "127.0.0.1", r));
const port = mock.address().port;
const child = spawn(process.execPath, ["server/index.js"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: "4184",
    RESUME_CONFIG_FILE: path.join(work, ".env.harness"),
    RESUME_HARNESS_HOME: path.join(work, "home"),
  },
  stdio: "ignore",
});
const endpoint = "http://127.0.0.1:4184";
const post = async (url, data) => {
  const r = await fetch(endpoint + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(60000),
  });
  const body = await r.json();
  assert.equal(r.status, 200, body.error);
  return body;
};
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(endpoint + "/api/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  const saved = await post("/api/harness/settings", {
    apiKey: "test-only-not-a-real-key",
    model: "deepseek-flash",
    baseURL: `http://127.0.0.1:${port}`,
  });
  assert.equal(saved.configuration.hasKey, true);
  assert.ok(!JSON.stringify(saved).includes("test-only"));
  const tested = await post("/api/harness/connect", {});
  assert.match(tested.reply, /准备好/);
  const result = await post("/api/agent", {
    document: demoResume(),
    prompt: "精简个人优势",
    scope: "summary",
    route: { provider: "deepseek-official", model: "deepseek-flash" },
  });
  assert.equal(result.proposal.changes[0].section, "summary");
  assert.ok(calls >= 2);
  console.log(
    "PASS: real Harness SDK -> mock Messages API -> verified reply and validated section proposal; no real DeepSeek call",
  );
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once("exit", resolve);
    setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 6000).unref();
  });
  await new Promise((r) => mock.close(r));
  await rm(work, { recursive: true, force: true });
}
