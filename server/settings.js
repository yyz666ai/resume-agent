import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { MODEL_PROVIDERS } from "../src/providers.js";
export const DEFAULT_MODEL = MODEL_PROVIDERS.deepseek.models[0];
export const DEFAULT_BASE = MODEL_PROVIDERS.deepseek.baseURL;
function providerKeys(provider) {
  return provider === "deepseek"
    ? ["DEEPSEEK_API_KEY", "RESUME_MODEL", "DEEPSEEK_BASE_URL"]
    : ["API_KEY", "MODEL", "BASE_URL"].map((key) => provider.toUpperCase() + "_" + key);
}
export function createSettingsStore(filename = path.resolve(".env.harness")) {
  let loaded;
  async function read() {
    if (loaded) return loaded;
    try {
      const raw = await readFile(filename, "utf8");
      const pairs = raw
        .split("\n")
        .filter((l) => l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i), JSON.parse(l.slice(i + 1))];
        });
      loaded = Object.fromEntries(pairs);
    } catch (e) {
      if (e.code !== "ENOENT") throw Error("无法加载 API 配置，请重新保存配置");
      loaded = {};
    }
    return loaded;
  }
  async function activeProvider() {
    const provider = (await read()).RESUME_PROVIDER;
    return Object.hasOwn(MODEL_PROVIDERS, provider) ? provider : "deepseek";
  }
  async function credentials(provider) {
    provider ??= await activeProvider();
    const c = await read();
    const [key, model, base] = providerKeys(provider);
    const defaults = MODEL_PROVIDERS[provider];
    return {
      apiKey: c[key],
      model: c[model] || defaults.models[0] || "",
      baseURL: c[base] || defaults.baseURL,
    };
  }
  async function status(provider) {
    const { apiKey, model, baseURL } = await credentials(provider);
    return { hasKey: !!apiKey, model, baseURL };
  }
  async function save(input) {
    const provider = input.provider ?? "deepseek";
    if (!Object.hasOwn(MODEL_PROVIDERS, provider))
      throw Error("不支持的模型提供商");
    const [key, model, base] = providerKeys(provider);
    const c = { ...(await read()), RESUME_PROVIDER: provider };
    if (
      typeof input.apiKey !== "string" ||
      /[\r\n]/.test(input.apiKey) ||
      input.apiKey.length > 1000
    )
      throw Error("API Key 格式有误");
    if (input.apiKey.trim()) c[key] = input.apiKey.trim();
    if (!c[key]) throw Error("请先填写 " + MODEL_PROVIDERS[provider].label + " API Key");
    if (
      typeof input.model !== "string" ||
      !/^[\w./:@-]{1,150}$/.test(input.model)
    )
      throw Error("模型 ID 格式有误");
    c[model] = input.model;
    const url = new URL(input.baseURL || MODEL_PROVIDERS[provider].baseURL);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw Error("API 地址格式有误");
    if (
      url.protocol === "http:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname)
    )
      throw Error("远程 API 地址必须使用 HTTPS");
    c[base] = url.href.replace(/\/$/, "");
    await mkdir(path.dirname(filename), { recursive: true });
    const tmp = filename + ".tmp";
    await writeFile(
      tmp,
      Object.entries(c)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join("\n") + "\n",
      { mode: 0o600 },
    );
    await rename(tmp, filename);
    loaded = c;
    return status();
  }
  async function environment() {
    const c = await read();
    return {
      ...process.env,
      ...(c.DEEPSEEK_API_KEY
        ? {
            DEEPSEEK_API_KEY: c.DEEPSEEK_API_KEY,
            DEEPSEEK_BASE_URL: c.DEEPSEEK_BASE_URL || DEFAULT_BASE,
          }
        : {}),
    };
  }
  return { status, save, environment, activeProvider, credentials };
}
export const settings = createSettingsStore(process.env.RESUME_CONFIG_FILE);
