import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { pageImages, photoFromCandidate } from "./pdf-images.js";
import { restoreReferenceLayout } from "./reference-pdf.js";
import { parseResume, item } from "../src/model.js";
const datePattern =
  /\d{4}[-./年]\d{1,2}(?:月)?\s*[-—–~至]\s*(?:\d{4}[-./年]\d{1,2}(?:月)?|至今|现在)/;
export async function extractPdf(buffer) {
  const loading = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
  });
  const pdf = await loading.promise;
  try {
    if (pdf.numPages > 30) throw Error("请上传 30 页以内的简历");
    const all = [],
      positioned = [],
      images = [],
      imageWarnings = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const extracted = await pageImages(page, p);
      images.push(...extracted.images);
      imageWarnings.push(...extracted.warnings);
      const content = await page.getTextContent();
      const rows = [];
      for (const t of content.items) {
        if (!t.str?.trim()) continue;
        const y = t.transform[5],
          x = t.transform[4];
        let row = rows.find((r) => Math.abs(r.y - y) < 2.5);
        if (!row) {
          row = { y, parts: [] };
          rows.push(row);
        }
        row.parts.push({ x, text: t.str, width: t.width, height: t.height, font: t.fontName });
      }
      rows.sort((a, b) => b.y - a.y);
      for (const row of rows) {
        row.parts.sort((a, b) => a.x - b.x);
        let line = "",
          end = 0;
        for (const part of row.parts) {
          if (line && part.x - end > 12) line += "\t";
          line += part.text;
          end = part.x + part.width;
        }
        all.push(line.trim());
        positioned.push({ ...row, text: line.trim(), page: p });
      }
    }
    const text = all.join("\n");
    if (text.replace(/\s/g, "").length < 30)
      throw Error(
        "未识别到足够的文字。此 PDF 可能是扫描件，请先进行 OCR，或使用文字版 PDF。",
      );
    const document = parseResume(text);
    // 日期所在行通常是经历条目的标题。按视觉阅读顺序拆成独立表单。
    for (const key of ["education", "experience", "projects"]) {
      const body = document.sections[key].items[0]?.body;
      if (!body) continue;
      const lines = body.split("\n");
      const entries = [];
      let entry = null;
      for (const line of lines) {
        const date = line.match(datePattern)?.[0];
        if (date) {
          if (entry) entries.push(entry);
          const title = line.replace(date, "").trim();
          entry = { ...item(title), date };
        } else if (entry) {
          if (!entry.title) entry.title = line;
          else if (
            !entry.subtitle &&
            !entry.body &&
            !/^[•·●\-]/.test(line) &&
            line.length < 80
          )
            entry.subtitle = line;
          else entry.body += (entry.body ? "\n" : "") + line;
        } else {
          entry = item("", line);
        }
      }
      if (entry) entries.push(entry);
      document.sections[key].items = entries;
    }
    for (const [key, section] of Object.entries(document.sections))
      for (const entry of section.items)
        entry.body = paragraphs(
          entry.body,
          !["awards", "certificates"].includes(key),
        );
    let bytes = 0;
    const candidates = images
      .filter((image) => {
        bytes += image.dataUrl.length;
        return bytes < 3000000;
      })
      .slice(0, 32);
    if (candidates.length < images.length)
      imageWarnings.push(
        "图片较多，已保留大小限制内的前 32 张，请从原 PDF 检查其余图片",
      );
    if (candidates.length) {
      document.photoCandidates = candidates;
      const likely = candidates.find(
        (image) =>
          image.width >= 80 &&
          image.height >= 80 &&
          image.width / image.height > 0.5 &&
          image.width / image.height < 1.6,
      );
      if (likely) document.photo = photoFromCandidate(likely);
    }
    restoreReferenceLayout(document, positioned);
    return {
      document,
      text,
      pages: pdf.numPages,
      images: candidates,
      imageWarnings,
    };
  } finally {
    await loading.destroy();
  }
}

function paragraphs(text, merge = true) {
  const escape = (s) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const groups = [];
  for (const line of text.split("\n").filter(Boolean)) {
    if (/^[•●·]/.test(line)) groups.push(line);
    else if (merge && groups.length && groups.at(-1).length > 32)
      groups[groups.length - 1] += line;
    else groups.push(line);
  }
  return groups
    .map((line) =>
      /^[•●·]/.test(line)
        ? "<ul><li>" + escape(line.replace(/^[•●·]\s*/, "")) + "</li></ul>"
        : "<p>" + escape(line) + "</p>",
    )
    .join("");
}
