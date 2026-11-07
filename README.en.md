<div align="center">
  <img src="public/logo.svg" alt="Resume Agent logo" width="88">
  <h1>Resume Agent</h1>
  <p>An open-source resume editor with AI editing, live layout, and PDF export.</p>
  <p><a href="README.md">简体中文</a> · <strong>English</strong></p>
</div>

## About Resume Agent

Resume Agent is a self-hosted workspace for building and tailoring resumes. Edit the document directly on an A4 preview, keep independent versions for different roles, and use a configured model to organize imports or refine selected passages. The same layout powers the preview and PDF export.

- **Resume library:** Create, import, duplicate, rename, and delete independent versions.
- **Three-pane editor:** Manage sections on the left, edit the A4 preview in the center, and refine content with the AI panel on the right.
- **Templates and formatting:** Choose from ten templates and adjust typography, spacing, margins, and portrait size.
- **AI-assisted imports and edits:** Organize PDF text into sections, edit a selected entry, and regenerate or undo changes.
- **Personal profile:** Reuse factual experience and preferences across resumes when profile reference is enabled.

| Home agent | Resume library |
| --- | --- |
| <a href="docs/screenshots/agent.png"><img src="docs/screenshots/agent.png" width="360" alt="Home agent"></a> | <a href="docs/screenshots/library.png"><img src="docs/screenshots/library.png" width="360" alt="Resume library"></a> |

| Three-pane editor | Model and API |
| --- | --- |
| <a href="docs/screenshots/editor.png"><img src="docs/screenshots/editor.png" width="360" alt="Three-pane editor"></a> | <a href="docs/screenshots/settings.png"><img src="docs/screenshots/settings.png" width="360" alt="Model and API"></a> |

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

### 1. Start a resume in three ways

1. **Start from scratch in Resume Agent.** Open the home agent and describe your background, target role, and what you want to highlight. For example: “Draft a resume for a junior product manager role using the internship and project experience below.” After sending, open the generated version in **My resumes** or keep refining it in chat.
2. **Start from your profile.** Fill in your education, work, projects, and skills under **Profile**. Then select **Create from profile** in **My resumes** to open an editable copy. You can also choose your profile as the source in Resume Agent and ask for a version tailored to a specific role.
3. **Import an existing PDF.** Drop it into **My resumes** or upload it to Resume Agent and send an instruction. The app extracts the text, uses your configured model to organize it into editable sections, and renders an A4 preview. Review the imported sections and refine them in the editor. Scanned PDFs require OCR first. JSON backups can also be imported from **My resumes**.

Once the resume is open, choose from ten layouts under **Templates**, including Classic White, Teal Section Bands, single-column, and sidebar designs. Switching templates keeps the content and updates the preview. Continue editing or export a PDF when ready.

### 2. Editor

- **Left:** Edit sections, choose a template, and adjust typography, spacing, margins, and the portrait. Hide or reorder sections as needed.
- **Center:** Click text in the A4 preview to edit it. Leaving the field saves it. The close button hides an entire contact field, which you can restore from the left panel.
- **Right:** Select a section or entry and give an instruction such as “Rewrite this experience as three bullet points.” Changes apply immediately. Continue the conversation, regenerate the result, or undo the last change.
- **Export:** Use **Export PDF**. If the app reports a missing PDF rendering runtime, run `npx playwright install chromium` in the project directory and retry.

### 3. Profile and language

Keep factual experience and job preferences in **Profile**. Enable profile reference in settings or in chat when you want the model to use those facts. Choosing English adds an English-output instruction to chat and rewriting prompts. Existing resumes and PDF imports retain the source language.

### 4. Switch models

In **Model and API**, select a provider, check the model and endpoint, then select **Save and test a response**. Settings are saved per provider. Leave the key field empty when switching back to reuse the saved key. The home agent, editor, and AI-assisted PDF import use the active model.

## Skills

The app uses **one project skill** at runtime.

| Skill | Path | Rules and invocation |
| --- | --- | --- |
| Resume editing | [server/skills/resume-editor/SKILL.md](server/skills/resume-editor/SKILL.md) | Markdown rules cover factual accuracy, rewriting, selection scope, and output. [server/prompts.js](server/prompts.js) includes the rules in prompts for both the home agent and the editor assistant. |

PDF import uses a separate classification prompt in [server/import-resume.js](server/import-resume.js).

[More screenshots](docs/screenshots) · [MIT license](LICENSE)
