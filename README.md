<div align="center">
  <img src="public/logo.svg" alt="简历Agent Logo" width="88">
  <h1>简历Agent</h1>
  <p>开源简历编辑器，支持 AI 修改、实时排版和 PDF 导出。</p>
  <p><a href="README.en.md">English</a></p>
</div>

![简历编辑器，使用虚构资料](docs/screenshots/editor.png)

## 产品介绍

简历Agent 是一个可以在本机运行的开源简历工作台。从已有 PDF 导入或从空白开始，都可以直接在 A4 预览上修改内容。你可以为不同岗位保留独立版本，让 AI 整理原文或优化选中的段落，再按当前版式导出 PDF。

- **多份简历管理**：支持新建、导入、复制、改名和删除，便于按岗位准备独立版本。
- **三栏编辑器**：左侧管理栏目，中间直接编辑 A4 预览，右侧用 AI 修改指定模块或条目。
- **模板和排版**：十套模板，可调整字号、行距、页边距、模块间距和照片大小。
- **AI 导入与改写**：把 PDF 原文整理为可编辑栏目，修改后还能继续追问、重新生成或撤回。
- **个人档案**：集中记录真实经历和求职偏好，按需作为改写参考。

## 启动

使用 Node.js 24.9 或更新版本。克隆仓库、进入项目目录，再启动：

```sh
git clone https://github.com/yyz666ai/resume-agent.git
cd resume-agent
npm ci
npm run dev
```

打开 [localhost:4173](http://localhost:4173)。

## 配置 API Key

打开 **Agent 设置 → 模型与 API**，选择 DeepSeek、千问、智谱、Kimi 或自定义兼容 API，填入对应的 API Key，核对模型和地址，点 **保存并测试回答**。

**DeepSeek Harness 无需单独安装。** 仓库包含集成代码，Harness SDK 及其依赖随 `npm ci` 安装，使用 DeepSeek 时由应用启动。使用其他提供商时直接调用兼容 API。

## 使用方法

### 1. 我的简历

点「新建简历」从空白开始，或把 PDF / JSON 拖进页面。PDF 会提取文字和内嵌图片，由当前模型整理栏目；确认前可对照提取原文。扫描件需要先做 OCR。卡片标题旁的铅笔用于改名，预览右上角可复制或删除。复制一份即可针对新岗位独立修改。

### 2. 编辑器

- **左侧**切换内容、模板和排版。可编辑基本信息、添加经历、隐藏或排序模块，调整字号、行距、页边距和照片。
- **中间**是可直接编辑的 A4 预览。点击文字修改，失焦保存。点个人信息旁的叉可隐藏整项，原值可从左侧恢复。
- **右侧**选定模块或条目，再输入要求，例如「把这段经历改成三条要点」。模型修改会直接应用。可继续追问、重新生成或撤回本次修改。
- **导出**使用右上角「导出 PDF」。如果提示缺少 PDF 渲染运行时，在项目目录运行 `npx playwright install chromium` 后重试。

### 3. 首页简历 Agent

可上传 PDF、选择一份已有简历，或直接描述经历和目标岗位。发送要求后，生成的版本会出现在「我的简历」中，可以继续对话细化或打开编辑器。

### 4. 个人档案与语言

在「个人档案」填写真实经历、求职方向和补充事实。要让 AI 参考它，在设置或对话里打开「参考个人档案」。切换界面到 English 后，AI 对话和改写提示词会加入「用英文输出」。已有简历和 PDF 导入保留原文语言。

### 5. 切换模型

在「模型与 API」选择另一个提供商，核对模型和地址，再点「保存并测试回答」。各提供商的配置分别保存，切回时密钥栏留空即可复用。首页 Agent、编辑器和 PDF 智能导入都会使用当前保存的模型。

## Skills

运行时使用 **1 个项目 Skill**。

| Skill | 路径 | 写法与调用位置 |
| --- | --- | --- |
| 简历编辑 | [server/skills/resume-editor/SKILL.md](server/skills/resume-editor/SKILL.md) | 用 Markdown 定义事实约束、改写规则、选区边界和输出格式。[server/prompts.js](server/prompts.js) 读取它并组装提示词，首页 Agent 和右侧助手请求都会使用。 |

PDF 导入的文字归类另用 [server/import-resume.js](server/import-resume.js) 中的专用提示词。

[更多截图](docs/screenshots) · [MIT 许可证](LICENSE)
