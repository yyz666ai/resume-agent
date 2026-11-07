import { validateProfile, verifiedProfileSuggestion } from "../src/profile.js";
import express from "express";
import multer from "multer";
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractPdf } from "./pdf.js";
import { organizeImportedResume } from "./import-resume.js";
import { validateDocument, applyProposal } from "../src/model.js";
import {
  harnessStatus,
  classifyResumeText,
  askHarness,
  closeHarness,
  testHarness,
} from "./harness.js";
import { constrainTarget } from "./target.js";
import { settings } from "./settings.js";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const app = express();
const port = Number(process.env.PORT || 4173);
let browser;
let exportBusy = false;
let agentBusy = false;
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
  if (req.method === "POST" && req.headers.origin) {
    try {
      const url = new URL(req.headers.origin);
      if (url.host !== req.headers.host)
        return res.status(403).json({ error: "请从当前网页发起操作" });
    } catch {
      return res.status(403).json({ error: "无效的来源" });
    }
  }
  next();
});
app.use(express.json({ limit: "12mb" }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
});
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.post("/api/import", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file || req.file.buffer.subarray(0, 5).toString() !== "%PDF-")
      return res
        .status(400)
        .json({ error: "请选择有效的 PDF 文件（最大 15 MB）" });
    const extracted = await extractPdf(req.file.buffer);
    if (req.query.mode !== "ai") return res.json(extracted);
    if (extracted.text.length > 60000)
      throw Error("PDF 文字过多，请拆分后再用 AI 导入。");
    if (agentBusy)
      return res.status(429).json({ error: "助手正在处理上一条请求，请稍候再导入" });
    agentBusy = true;
    try {
      const response = await classifyResumeText(extracted.text);
      res.json(organizeImportedResume(extracted, response));
    } catch (error) {
      throw Error("AI 导入失败，请检查 Agent 设置后重新导入。 " + error.message);
    } finally {
      agentBusy = false;
    }
  } catch (e) {
    next(e);
  }
});
app.get("/api/harness/status", async (_req, res, next) => {
  try {
    res.json(await harnessStatus());
  } catch (e) {
    next(e);
  }
});
app.post("/api/harness/settings", async (req, res, next) => {
  if (agentBusy)
    return res
      .status(409)
      .json({ error: "助手正在处理请求，请结束后再修改配置" });
  try {
    const configuration = await settings.save(req.body);
    await closeHarness();
    res.json({ configuration });
  } catch (e) {
    next(e);
  }
});
app.post("/api/harness/connect", async (req, res, next) => {
  if (agentBusy) return res.status(409).json({ error: "助手正在处理请求" });
  try {
    agentBusy = true;
    const result = await testHarness(req.body);
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  } finally {
    agentBusy = false;
  }
});
app.post("/api/agent", async (req, res, next) => {
  if (agentBusy)
    return res.status(429).json({ error: "助手正在处理上一条请求，请稍候" });
  agentBusy = true;
  try {
    const {
      document,
      prompt,
      scope,
      route,
      target,
      images,
      reference,
      conversation,
      workflow,
      language,
    } = req.body;
    validateDocument(document);
    if (language !== undefined && !["zh", "en"].includes(language))
      throw Error("不支持的界面语言");
    if (workflow !== undefined && workflow !== "home")
      throw Error("不支持的处理流程");
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 10000)
      throw Error("请输入 10000 字以内的修改要求");
    if (reference) {
      if (typeof reference !== "object" || Array.isArray(reference))
        throw Error("档案参考格式无效");
      if (reference.profile) validateProfile(reference.profile);
      for (const key of ["writingStyle", "targetJob"])
        if (
          reference[key] !== undefined &&
          (typeof reference[key] !== "string" || reference[key].length > 2000)
        )
          throw Error("写作偏好过长");
      if (JSON.stringify(reference).length > 2500000)
        throw Error("档案过大，请精简后重试");
    }
    const raw = await askHarness({
      document,
      prompt,
      scope,
      route,
      target,
      images,
      reference,
      conversation,
      workflow,
      language,
    });
    const proposal = constrainTarget(document, raw, target);
    if (workflow === "home") {
      const suggestion = verifiedProfileSuggestion(raw, prompt, conversation);
      delete proposal.profileSuggestion;
      if (suggestion) proposal.profileSuggestion = suggestion;
    }
    applyProposal(document, proposal, scope);
    res.json({ proposal });
  } catch (e) {
    next(e);
  } finally {
    agentBusy = false;
  }
});
app.post("/api/export", async (req, res, next) => {
  if (exportBusy)
    return res.status(429).json({ error: "正在生成 PDF，请稍候重试" });
  exportBusy = true;
  let page;
  try {
    const doc = validateDocument(req.body.document);
    const chrome =
      process.env.CHROME_PATH ||
      [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
      ].find(existsSync);
    if (!browser?.isConnected())
      browser = await chromium.launch({
        headless: true,
        ...(chrome ? { executablePath: chrome } : {}),
        args: ["--no-sandbox"],
      });
    page = await browser.newPage();
    await page.addInitScript(
      (data) => sessionStorage.setItem("resume-print", JSON.stringify(data)),
      doc,
    );
    await page.goto(`http://127.0.0.1:${port}/print`, {
      waitUntil: "networkidle",
    });
    await page.waitForFunction(() => window.__RESUME_READY__ === true, {
      timeout: 20000,
    });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() =>
      Promise.all([...document.images].map((image) => image.decode())),
    );
    if (await page.evaluate(() => window.__RESUME_OVERFLOW__))
      throw Error("内容超出页面，请拆分长段落或缩短侧栏技能");
    const result = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    await page.close();
    page = null;
    exportBusy = false;
    res.type("pdf").attachment("resume.pdf").send(result);
  } catch (e) {
    next(e);
  } finally {
    await page?.close();
    exportBusy = false;
  }
});
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use((err, _req, res, _next) => {
  const message =
    err.code === "LIMIT_FILE_SIZE"
      ? "文件超过 15 MB，请压缩后重试"
      : err.message || "操作失败，请稍后再试";
  res.status(400).json({ error: message });
});
const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`AI简历工作台 http://localhost:${port}`),
);
for (const sig of ["SIGTERM", "SIGINT"])
  process.on(sig, async () => {
    await closeHarness();
    await browser?.close();
    server.close(() => process.exit(0));
  });
