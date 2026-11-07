export const MODEL_PROVIDERS = {
  deepseek: {
    label: "DeepSeek",
    baseURL: "https://api.deepseek.com/anthropic",
    models: ["deepseek-flash", "deepseek-v4-pro"],
  },
  qwen: {
    label: "千问 Qwen",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-plus"],
  },
  zhipu: {
    label: "智谱 GLM",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4.7"],
  },
  kimi: {
    label: "Kimi",
    baseURL: "https://api.moonshot.cn/v1",
    models: ["kimi-k2.5"],
  },
  custom: {
    label: "自定义兼容 API",
    baseURL: "",
    models: [],
  },
};
