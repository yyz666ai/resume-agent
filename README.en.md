<div align="center">
  <img src="public/logo.svg" alt="Resume Studio logo" width="96">
  <h1>Resume Studio</h1>
  <p>An open-source resume workspace with direct editing, AI-assisted organization, and A4 PDF export.</p>
  <p><a href="README.md">简体中文</a> · English</p>
</div>

## Screenshots

All screenshots were captured in a fresh browser session using fictional sample data.

| Resume Agent | My resumes |
| --- | --- |
| ![Resume Agent landing page](docs/screenshots/agent.png) | ![Resume library with drag-and-drop import](docs/screenshots/library.png) |
| **Three-pane editor** | **Model and API settings** |
| ![Three-pane editor showing a fictional resume](docs/screenshots/editor.png) | ![Model selection and API configuration](docs/screenshots/settings.png) |

## Features

- **Keep separate versions.** Create, duplicate, rename, and delete resumes tailored to different roles.
- **Edit directly on the A4 preview.** Manage sections on the left, edit the document in the center, and ask the assistant on the right to update a specific section or entry. Changes apply immediately and can be refined, regenerated, or undone.
- **Import PDF or JSON.** PDF import extracts text and recognizable embedded portraits, then asks the configured model to organize the content. Review it against the source text before importing. JSON backups load directly. Scanned PDFs require OCR first.
- **Choose a template and export a PDF.** Ten templates share the pagination engine. Adjust font size, line height, margins, section spacing, and portrait size.
- **Keep a personal profile.** Store factual experience and writing preferences, and choose whether to share them with the model. The profile, resumes, and interface preferences are saved in the current browser.

## Run locally

You need Node.js **24.9+**, npm, and Chromium. Install the browser for PDF export.

```sh
git clone https://github.com/yyz666ai/resume-studio.git
cd resume-studio
npm ci
npx playwright install chromium
npm run dev
```

Open [http://localhost:4173](http://localhost:4173). On macOS the server can use an installed copy of Chrome. Set `CHROME_PATH` to use another executable. On Linux, run `npx playwright install --with-deps chromium` if system libraries are missing.

```sh
npm test
npm run build
npm start
```

| Server environment variable | Purpose |
| --- | --- |
| `HOST` | Defaults to `127.0.0.1`. Set `0.0.0.0` for container networking. |
| `PORT` | Defaults to `4173`. |
| `CHROME_PATH` | Optional path to a Chrome or Chromium executable. |
| `RESUME_CONFIG_FILE` | Optional model configuration path. Defaults to `.env.harness` in the project root. |
| `DSH_HOME` | Optional path for an existing DeepSeek Harness configuration. |

A [Dockerfile](Dockerfile) is included. The app has no account authentication. For remote access, use a private network or an authenticated reverse proxy, especially on an instance that stores model credentials.

## Configure a model

Open **Agent settings → Model and API**. Select a provider, enter its API key, check the model ID and base URL, then select **Save and test a response**. Each provider keeps separate settings. When switching back to a configured provider, leave the key field empty to reuse the saved key. The current model serves the Resume Agent, editor assistant, and AI-assisted PDF import.

| Provider | Default model | Default base URL |
| --- | --- | --- |
| DeepSeek | `deepseek-flash` | `https://api.deepseek.com/anthropic` (Messages protocol via DeepSeek Harness) |
| Qwen | `qwen-plus` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Zhipu | `glm-4.7` | `https://open.bigmodel.cn/api/paas/v4` |
| Kimi | `kimi-k2.5` | `https://api.moonshot.cn/v1` |
| Custom | Enter a model ID | An OpenAI-compatible Chat Completions endpoint |

Use the endpoint, region, and model associated with your key, then run the connection test. Manual editing, layout, and PDF export work without a model key. AI features may incur provider usage charges. DeepSeek uses the pinned `@deepseek-ai/dsh-sdk-client@0.2.2-alpha.2`. The other providers use compatible Chat Completions requests.

### English output

Select **English** in the interface language setting under **Agent settings → Profile and writing preferences**. Subsequent chat and edit requests include an explicit instruction to respond and write new resume prose in English. Changing the interface language leaves existing content intact, and PDF import preserves the source language. To translate an existing resume, select the entire document and ask for an English version.

### Credentials and personal data

The repository includes the DeepSeek **integration code**. Each user supplies their own API key. The server saves credentials in the Git-ignored `.env.harness` file with mode `0600` by default. Saved keys are never returned to the browser. Personal resumes, uploads, and local Harness data are excluded from the published source. AI requests send the relevant resume text and prompt to the active provider. When profile reference is enabled, relevant profile content is sent as well.

## Project structure and tests

- `src/` contains the React interface, document model, templates, and shared preview.
- `server/` serves the app, imports and exports PDFs, and calls model providers.
- `server/skills/resume-editor/SKILL.md` defines the resume-editing prompt.
- `tests/` contains unit tests and browser workflow checks. With the local server running, try `node tests/portal.mjs`, `node tests/home-agent.mjs`, or `node tests/template-exports.mjs`. Browser scripts default to Chrome on macOS. Check the script for browser configuration on other systems.

Issues and pull requests are welcome. Please use fictional resumes when reporting a problem and leave out credentials and personal information.

## License

[MIT](LICENSE).
