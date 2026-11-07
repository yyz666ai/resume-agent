import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { MODEL_PROVIDERS } from "../src/providers.js";
import { settings, DEFAULT_MODEL } from "./settings.js";
import { importPrompt } from "./import-resume.js";
import { resumePrompt } from "./prompts.js";
import { imageBlocks } from "./images.js";
import { supportsImages } from "../src/capabilities.js";
import { MODULES } from "../src/model.js";
const require = createRequire(import.meta.url);
let harness = null,
  connected = false,
  currentRoute = "";
let apiVerified = false;
let lastTestedAt = null;
let lastTestError = null;
export const harnessHome =
  process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
export async function harnessStatus() {
  let installed = false;
  try {
    require.resolve("@deepseek-ai/dsh-sdk-client");
    installed = true;
  } catch {}
  const provider = await settings.activeProvider();
  const configuration = await settings.status(provider);
  const providers = Object.fromEntries(await Promise.all(
    Object.keys(MODEL_PROVIDERS).map(async (id) => [id, await settings.status(id)]),
  ));
  return {
    installed,
    connected,
    apiVerified,
    configuration,
    provider,
    providers,
    capabilities: { images: provider === "deepseek" && supportsImages(configuration.model) },
    lastTestedAt,
    lastTestError,
    home: harnessHome,
    message: apiVerified ? "回答测试通过" : "尚未验证模型回答",
  };
}
export async function connectHarness(route = {}) {
  const provider =
    route.provider || process.env.DSH_PROVIDER || "deepseek-official";
  const configuration = await settings.status("deepseek");
  const model = configuration.hasKey
    ? configuration.model
    : route.model || process.env.DSH_MODEL || DEFAULT_MODEL;
  if (
    !/^[a-zA-Z0-9_./:@-]{1,150}$/.test(provider) ||
    !/^[a-zA-Z0-9_./:@-]{1,150}$/.test(model)
  )
    throw Error("Provider 或 Model ID 格式有误");
  const signature = provider + "|" + model;
  if (harness && currentRoute === signature && connected) return harness;
  await closeHarness();
  let DeepSeekHarness;
  try {
    ({ DeepSeekHarness } = await import("@deepseek-ai/dsh-sdk-client"));
  } catch {
    throw Error(
      "Harness SDK 未安装完成。请运行 npm install --legacy-peer-deps 后重启服务。",
    );
  }
  try {
    harness = new DeepSeekHarness({
      profile: "sdk",
      dshHome: configuration.hasKey
        ? path.resolve(
            process.env.RESUME_HARNESS_HOME || ".private/harness-app",
          )
        : harnessHome,
      env: await settings.environment(),
      provider,
      model,
      initializeTimeoutMs: 30000,
      requestTimeoutMs: 120000,
      approvalRequests: true,
      onUserQuestion: async () => ({ cancelled: true }),
    });
    // 本产品只需要文字建议；拒绝 Harness 请求的外部操作授权。
    harness.client.start();
    harness.client.onRequest(async () => ({ outcome: "rejected" }));
    await harness.start();
    connected = true;
    currentRoute = signature;
    return harness;
  } catch {
    await closeHarness();
    throw Error(
      "Harness 连接失败。请用相同 DSH_HOME 启动 Harness Web，在其中配置 API 与模型，并核对 Provider / Model ID。",
    );
  }
}
export async function askHarness({
  document,
  prompt,
  scope = "all",
  route,
  target,
  images = [],
  reference,
  conversation,
  workflow,
  language,
}) {
  if (
    scope !== "all" &&
    scope !== "basics" &&
    !Object.hasOwn(document.sections, scope)
  )
    throw Error("不支持的修改范围");
  const provider = await settings.activeProvider();
  const configuration = await settings.status(provider);
  const attachments = imageBlocks(images);
  if (
    attachments.length &&
    (provider !== "deepseek" || !supportsImages(
      configuration.hasKey
        ? configuration.model
        : route?.model || DEFAULT_MODEL,
    ))
  )
    throw Error("当前配置未启用图片输入，请切换到 DeepSeek 的 deepseek-flash 后重试");
  let targetInstruction = "";
  if (target?.entryId) {
    const row = document.sections[target.section]?.items.find(
      (e) => e.id === target.entryId,
    );
    if (!row || target.section !== scope)
      throw Error("选中条目与修改范围不一致，请重新选择");
    targetInstruction = `本次只允许修改这个条目：${JSON.stringify(row)}。用户高亮的重点文字为：${String(target.text || "").slice(0, 5000)}。changes 只返回该条目的一个 item，不要返回同模块其他条目，服务端会保留其他内容。不能改全局 style；不涉及修改的问题使用 changes:[]。`;
  }
  const instructions = resumePrompt({
    document,
    prompt,
    scope,
    targetInstruction,
    reference,
    conversation,
    workflow,
    language,
  });
  const proposal = await runJson(instructions, attachments, route);
  if (typeof proposal.message !== "string")
    proposal.message = "已准备好修改建议。";
  return proposal;
}

export async function classifyResumeText(text) {
  return runJson(importPrompt(text));
}

async function modelReply(instructions, attachments = [], route) {
  const provider = await settings.activeProvider();
  if (provider !== "deepseek") {
    const { apiKey, model, baseURL } = await settings.credentials(provider);
    if (!apiKey) throw Error("请先配置当前提供商的 API Key");
    const endpoint = baseURL.endsWith("/chat/completions") ? baseURL : baseURL + "/chat/completions";
    const response = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(120000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: instructions }] }),
    });
    if (!response.ok) throw Error(`模型 API 请求失败（HTTP ${response.status}），请检查密钥、模型、额度和地址。`);
    const data = await response.json();
    const choice = data?.choices?.[0];
    if (choice?.finish_reason === "length") throw Error("模型回复被截断，请缩短输入后重试。");
    if (typeof choice?.message?.content !== "string" || !choice.message.content.trim())
      throw Error("模型 API 未返回正文，请检查模型与地址。");
    return choice.message.content;
  }
  const h = await connectHarness(route);
  const result = await h.run(
    attachments.length ? [{ type: "text", text: instructions }, ...attachments] : instructions,
  );
  if (result.finishReason === "error")
    throw Error("Harness 未完成请求，请检查其中的 API 配置");
  return result.finalResponse || "";
}

async function runJson(instructions, attachments, route) {
  try {
    const text = await modelReply(instructions, attachments, route);
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/, "")
      .replace(/\s*```$/, "");
    let proposal;
    try {
      proposal = JSON.parse(cleaned);
      if (!proposal || typeof proposal !== "object" || Array.isArray(proposal))
        throw Error();
    } catch {
      throw Error("模型未返回有效 JSON，请重新描述要求后再试。");
    }
    apiVerified = true;
    lastTestError = null;
    return proposal;
  } catch (e) {
    if (e.name === "TimeoutError" || e instanceof TypeError)
      throw Error("模型请求失败，请检查网络或 API 地址。");
    throw e;
  }
}
export async function closeHarness() {
  connected = false;
  apiVerified = false;
  lastTestedAt = null;
  lastTestError = null;
  if (harness) {
    const old = harness;
    harness = null;
    await old.close().catch(() => {});
  }
}

export async function testHarness(route = {}) {
  try {
    const reply = await modelReply(
      "不要使用工具。请严格只回复：RESUME_API_OK 你好，简历助手已准备好。",
      [],
      route,
    );
    if (!reply.includes("RESUME_API_OK")) throw Error("未收到预期的测试回复");

    apiVerified = true;
    lastTestedAt = new Date().toISOString();
    lastTestError = null;
    return { reply: reply.replace("RESUME_API_OK", "").trim() };
  } catch {
    apiVerified = false;
    lastTestedAt = new Date().toISOString();
    lastTestError = "联通测试失败，请检查密钥、余额、模型或网络";
    throw Error(
      "模型联通失败，请检查当前提供商的 API Key、余额、模型名称和网络。",
    );
  }
}
