<div align="center">
  <img src="public/logo.svg" alt="简历Agent Logo" width="88">
  <h1>简历Agent</h1>
  <p>开源简历编辑器，支持 AI 修改、实时排版和 PDF 导出。</p>
  <p><a href="README.en.md">English</a> · <a href="docs/guide.md">详细使用指南</a></p>
</div>

![简历编辑器，使用虚构资料](docs/screenshots/editor.png)

## 启动

使用 Node.js 24.9 或更新版本。在项目目录运行：

```sh
npm ci
npm run dev
```

打开 [localhost:4173](http://localhost:4173)。

## 配置 API Key

打开 **Agent 设置 → 模型与 API**，选择 DeepSeek、千问、智谱、Kimi 或自定义兼容 API，填入对应的 API Key，核对模型和地址，点 **保存并测试回答**。

**DeepSeek Harness 无需单独安装。** 仓库包含集成代码，Harness SDK 及其依赖随 `npm ci` 安装，使用 DeepSeek 时由应用启动。使用其他提供商时直接调用兼容 API。

## Skills

运行时使用 **1 个项目 Skill**。

| Skill | 路径 | 写法与调用位置 |
| --- | --- | --- |
| 简历编辑 | [server/skills/resume-editor/SKILL.md](server/skills/resume-editor/SKILL.md) | 用 Markdown 定义事实约束、改写规则、选区边界和输出格式。[server/prompts.js](server/prompts.js) 读取它并组装提示词，首页 Agent 和右侧助手请求都会使用。 |

PDF 导入的文字归类另用 [server/import-resume.js](server/import-resume.js) 中的专用提示词。

[详细使用与部署指南](docs/guide.md) · [更多截图](docs/screenshots) · [MIT 许可证](LICENSE)
