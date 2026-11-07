import { DEFAULT_STYLE, validateDocument } from "./model.js";
export function initialAgentDocument(source) {
  const document = structuredClone(validateDocument(structuredClone(source)));
  document.style = { ...DEFAULT_STYLE };
  return document;
}
export function automaticResumeTitle(document, filename = "", suggested = "") {
  if (typeof suggested === "string" && suggested.trim())
    return suggested
      .trim()
      .replace(/[\r\n\t]/g, " ")
      .slice(0, 80);
  const name = document.basics.name?.trim();
  const role = document.basics.role?.trim();
  const file = filename.replace(/\.(pdf|json)$/i, "").trim();
  return (
    [name, role].filter(Boolean).join(" · ").slice(0, 75) +
      (name || role ? "简历" : "") ||
    file.slice(0, 80) ||
    "我的简历"
  );
}
