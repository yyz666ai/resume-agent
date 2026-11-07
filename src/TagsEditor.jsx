import { t } from "./i18n.js";
import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { item } from "./model.js";
export function tagTexts(entry) {
  const el = document.createElement("div");
  el.innerHTML = entry.body || "";
  let text = el.innerText || el.textContent || "";
  text = text.replace(/\r/g, "");
  const values = (
    entry.body?.includes("<")
      ? [...el.querySelectorAll("p,li")].map((e) => e.textContent)
      : text.split("\n")
  )
    .flatMap((t) => t.split(/[；;]/))
    .map((t) => t.trim())
    .filter(Boolean);
  return values.length ? values : entry.title ? [entry.title] : [];
}
const html = (text) =>
  "<p>" +
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;") +
  "</p>";
export default function TagsEditor({ section, sectionKey, update }) {
  const [draft, setDraft] = useState("");
  function add() {
    if (!draft.trim()) return;
    update((d) => {
      d.sections[sectionKey].items.push(item("", html(draft.trim())));
      d.sections[sectionKey].visible = true;
    });
    setDraft("");
  }
  return (
    <div className="tags-editor">
      <div className="editable-tags">
        {section.items.flatMap((entry, row) =>
          tagTexts(entry).map((text, index) => (
            <span key={entry.id + "-" + index}>
              {text}
              <button
                aria-label={t("删除标签 " + text)}
                onClick={() =>
                  update((d) => {
                    const values = tagTexts(d.sections[sectionKey].items[row]);
                    values.splice(index, 1);
                    if (!values.length)
                      d.sections[sectionKey].items.splice(row, 1);
                    else
                      d.sections[sectionKey].items[row].body = values
                        .map(html)
                        .join("");
                  })
                }
              >
                <X size={12} />
              </button>
            </span>
          )),
        )}
      </div>
      <div className="add-tag-input">
        <input
          aria-label={t("添加" + section.label + "标签")}
          placeholder={t("输入名称，回车添加")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
        />
        <button aria-label={t("确认添加" + section.label)} onClick={add}>
          <Plus size={17} />
        </button>
      </div>
    </div>
  );
}
