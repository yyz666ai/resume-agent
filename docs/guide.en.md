# Resume Agent user guide

[Back to README](../README.en.md) · [简体中文](guide.md)

## 1. My resumes

Create a blank resume or drop a PDF or JSON file onto the page. The app extracts PDF text and embedded images, and the active model organizes the sections. Compare the result with the source text before saving. Scanned files require OCR first. Use the pencil beside a title to rename it. Duplicate and delete actions are in the preview's top-right corner.

## 2. Editor

- **Left:** Edit sections, choose a template, and adjust typography, spacing, margins, and the portrait. Hide or reorder sections as needed.
- **Center:** Click text in the A4 preview to edit it. Leaving the field saves it. The close button hides an entire contact field, which you can restore from the left panel.
- **Right:** Select a section or entry and give an instruction such as “Rewrite this experience as three bullet points.” Changes apply immediately. Continue the conversation, regenerate the result, or undo the last change.
- **Export:** Use **Export PDF**. If the app reports a missing PDF rendering runtime, run `npx playwright install chromium` in the project directory and retry.

## 3. Home agent

Upload a PDF, choose an existing resume, or describe your experience and target role. The generated version appears in **My resumes**. Refine it in chat or open the editor.

## 4. Profile and language

Keep factual experience and job preferences in **Profile**. Enable profile reference in settings or in chat when you want the model to use those facts. Choosing English adds an English-output instruction to chat and rewriting prompts. Existing resumes and PDF imports retain the source language.

## 5. Model and API

Each provider has its own model ID, endpoint, and key. Select a provider and choose **Save and test a response** to switch. Leave the key field empty to reuse the saved key. DeepSeek uses the bundled Harness integration. Other providers use compatible Chat Completions endpoints.

## 6. Docker deployment

```sh
docker build -t resume-agent .
docker run --rm -p 127.0.0.1:4173:4173 -v resume-agent-data:/data/harness -e RESUME_CONFIG_FILE=/data/harness/.env.harness resume-agent
```

Open [localhost:4173](http://localhost:4173) and configure an API key in the app. The volume preserves server-side model settings. For remote access, use a private network or an authenticated reverse proxy.
