<div align="center">
  <img src="public/logo.svg" alt="Resume Agent logo" width="88">
  <h1>Resume Agent</h1>
  <p>An open-source resume editor with AI editing, live layout, and PDF export.</p>
  <p><a href="README.md">简体中文</a></p>
</div>

![Resume editor with fictional data](docs/screenshots/editor.png)

## About Resume Agent

Resume Agent is a self-hosted workspace for building and tailoring resumes. Edit the document directly on an A4 preview, keep independent versions for different roles, and use a configured model to organize imports or refine selected passages. The same layout powers the preview and PDF export.

- **Resume library:** Create, import, duplicate, rename, and delete independent versions.
- **Three-pane editor:** Manage sections on the left, edit the A4 preview in the center, and refine content with the AI panel on the right.
- **Templates and formatting:** Choose from ten templates and adjust typography, spacing, margins, and portrait size.
- **AI-assisted imports and edits:** Organize PDF text into sections, edit a selected entry, and regenerate or undo changes.
- **Personal profile:** Reuse factual experience and preferences across resumes when profile reference is enabled.

## Start

Use Node.js 24.9 or later. Clone the repository and start the app:

```sh
git clone https://github.com/yyz666ai/resume-agent.git
cd resume-agent
npm ci
npm run dev
```

Open [localhost:4173](http://localhost:4173).

## Configure an API key

In **Agent settings → Model and API**, select DeepSeek, Qwen, Zhipu, Kimi, or a custom compatible API. Enter the provider's API key, check the model and endpoint, and select **Save and test a response**.

**DeepSeek Harness requires no separate installation.** The repository includes the integration, and `npm ci` installs the Harness SDK and its dependencies. The app starts Harness for DeepSeek requests. Other providers use compatible APIs directly.

## How to use

### 1. My resumes

Create a blank resume or drop a PDF or JSON file onto the page. The app extracts PDF text and embedded images, and the active model organizes the sections. Compare the result with the source text before saving. Scanned files require OCR first. Use the pencil beside a title to rename it. Duplicate and delete actions are in the preview's top-right corner.

### 2. Editor

- **Left:** Edit sections, choose a template, and adjust typography, spacing, margins, and the portrait. Hide or reorder sections as needed.
- **Center:** Click text in the A4 preview to edit it. Leaving the field saves it. The close button hides an entire contact field, which you can restore from the left panel.
- **Right:** Select a section or entry and give an instruction such as “Rewrite this experience as three bullet points.” Changes apply immediately. Continue the conversation, regenerate the result, or undo the last change.
- **Export:** Use **Export PDF**. If the app reports a missing PDF rendering runtime, run `npx playwright install chromium` in the project directory and retry.

### 3. Home agent

Upload a PDF, choose an existing resume, or describe your experience and target role. The generated version appears in **My resumes**. Refine it in chat or open the editor.

### 4. Profile and language

Keep factual experience and job preferences in **Profile**. Enable profile reference in settings or in chat when you want the model to use those facts. Choosing English adds an English-output instruction to chat and rewriting prompts. Existing resumes and PDF imports retain the source language.

### 5. Switch models

In **Model and API**, select a provider, check the model and endpoint, then select **Save and test a response**. Settings are saved per provider. Leave the key field empty when switching back to reuse the saved key. The home agent, editor, and AI-assisted PDF import use the active model.

## Skills

The app uses **one project skill** at runtime.

| Skill | Path | Rules and invocation |
| --- | --- | --- |
| Resume editing | [server/skills/resume-editor/SKILL.md](server/skills/resume-editor/SKILL.md) | Markdown rules cover factual accuracy, rewriting, selection scope, and output. [server/prompts.js](server/prompts.js) includes the rules in prompts for both the home agent and the editor assistant. |

PDF import uses a separate classification prompt in [server/import-resume.js](server/import-resume.js).

[More screenshots](docs/screenshots) · [MIT license](LICENSE)
